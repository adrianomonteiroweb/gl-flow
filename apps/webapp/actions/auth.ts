'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { JwtPayload } from 'jsonwebtoken';

import { findUserByEmail, getMe } from '@/actions/users';
import { createJWT, verifyJWT } from '@workspace/utils/jwt';
import { SES } from '@workspace/utils/aws/ses';
import UserRepository from '@/repositories/UserRepository';
import { validatePasswordFull } from '@/lib/auth/password-breach';

const COOKIE_KEY = 'linharesflow_DOC_AT';
const BCRYPT_ROUNDS = 10;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const RESET_TOKEN_TTL_MINUTES = 60;

const cookieOptions = {
  httpOnly: true,
  path: '/',
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
};

const emailSchema = z.object({
  email: z.string().min(1).email(),
});

const loginSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

const resetSchema = z.object({
  uid: z.string().min(1),
  token: z.string().length(64),
  password: z.string().min(1),
});

type LoginAttempts = {
  count: number;
  locked_until: string | null;
  last_failed_at: string;
};

type ResetToken = {
  token_hash: string;
  expires_at: string;
};

/** Normalizes a jsonb column that may arrive as null, a string (double-encoded) or an object. */
const parseMetadata = (raw: unknown): Record<string, any> => {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw as Record<string, any>;
};

const sha256 = (input: string): string =>
  crypto.createHash('sha256').update(input).digest('hex');

const setSessionCookie = async (user: any): Promise<void> => {
  const { access_token, expires } = createJWT(user);
  (await cookies()).set({
    name: COOKIE_KEY,
    value: Buffer.from(access_token).toString('base64'),
    expires,
    ...cookieOptions,
  });
};

const sendPasswordResetEmail = async (email: string, uid: string, token: string): Promise<void> => {
  const base_url = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const reset_link = `${base_url}/reset-password?uid=${uid}&token=${token}`;

  if (!IS_PRODUCTION) {
    console.warn('Link de redefinição de senha:', reset_link);
  }

  try {
    await SES.send(
      {
        content: `
          <div style="text-align: center; font-family: Arial, sans-serif; padding: 24px;">
            <h2 style="margin: 0 0 12px;">Redefinição de senha</h2>
            <p style="margin: 0 0 20px; color: #4b5563;">Recebemos uma solicitação para redefinir a senha da sua conta no Grupo Linhares. Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${reset_link}" style="display: inline-block; background: #ff2300; color: #fff; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; letter-spacing: 0.01em;">
              Redefinir senha
            </a>
            <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px;">Este link expira em ${RESET_TOKEN_TTL_MINUTES} minutos. Se você não solicitou a redefinição, ignore este e-mail.</p>
          </div>
        `,
      },
      {
        to: email,
        subject: 'Redefinição de senha - Grupo Linhares',
      }
    );
  } catch (error) {
    console.error('Erro ao enviar e-mail de redefinição de senha:', error);
  }
};

export async function loginWithPassword(email: string, password: string) {
  try {
    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      return { status: 400, message: 'Dados inválidos.' };
    }

    const user = await findUserByEmail(parsed.data.email);

    if (!user) {
      return { status: 401, message: 'E-mail ou senha incorretos.' };
    }

    const metadata = parseMetadata(user.metadata);
    const login_attempts = metadata.login_attempts as LoginAttempts | undefined;

    if (login_attempts?.locked_until) {
      const remaining_ms = new Date(login_attempts.locked_until).getTime() - Date.now();

      if (remaining_ms > 0) {
        const minutes_remaining = Math.ceil(remaining_ms / 60_000);
        return {
          status: 429,
          message: `Conta bloqueada. Tente novamente em ${minutes_remaining} minuto${minutes_remaining !== 1 ? 's' : ''}.`,
          minutes_remaining,
        };
      }
    }

    if (!user.password) {
      return { status: 401, message: 'Você ainda não definiu uma senha.', no_password: true };
    }

    const valid = await bcrypt.compare(parsed.data.password, user.password);

    if (!valid) {
      const count = (login_attempts?.count ?? 0) + 1;

      metadata.login_attempts = {
        count,
        locked_until: count >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null,
        last_failed_at: new Date().toISOString(),
      } satisfies LoginAttempts;

      await UserRepository.update(user.id, { metadata });
      return { status: 401, message: 'E-mail ou senha incorretos.' };
    }

    delete metadata.login_attempts;
    await UserRepository.update(user.id, { metadata });

    await setSessionCookie(user);

    return { status: 200, session: await getSession(), user: await getMe() };
  } catch (error) {
    console.error('loginWithPassword:', error);
    return { status: 500, message: 'Erro interno do servidor.' };
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const parsed = emailSchema.safeParse({ email });

    if (!parsed.success) {
      return { status: 200 };
    }

    const user = await findUserByEmail(parsed.data.email);

    if (!user) {
      return { status: 200 };
    }

    const reset_token = crypto.randomBytes(32).toString('hex');
    const token_hash = sha256(reset_token);
    const metadata = parseMetadata(user.metadata);

    metadata.reset_token = {
      token_hash,
      expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000).toISOString(),
    } satisfies ResetToken;

    await UserRepository.update(user.id, { metadata });
    await sendPasswordResetEmail(user.email, user.id, reset_token);

    return { status: 200 };
  } catch (error) {
    console.error('requestPasswordReset:', error);
    return { status: 200 };
  }
}

export async function resetPassword(uid: string, token: string, password: string) {
  try {
    const parsed = resetSchema.safeParse({ uid, token, password });

    if (!parsed.success) {
      return { status: 400, message: 'Link inválido ou expirado.', invalid_token: true };
    }

    const user = await UserRepository.findById(parsed.data.uid);

    if (!user) {
      return { status: 400, message: 'Link inválido ou expirado.', invalid_token: true };
    }

    const metadata = parseMetadata(user.metadata);
    const reset_token_data = metadata.reset_token as ResetToken | undefined;

    if (!reset_token_data?.token_hash || !reset_token_data.expires_at) {
      return { status: 400, message: 'Link inválido ou expirado.', invalid_token: true };
    }

    if (new Date(reset_token_data.expires_at).getTime() < Date.now()) {
      delete metadata.reset_token;
      await UserRepository.update(user.id, { metadata });
      return { status: 400, message: 'Link inválido ou expirado.', invalid_token: true };
    }

    if (sha256(parsed.data.token) !== reset_token_data.token_hash) {
      return { status: 400, message: 'Link inválido ou expirado.', invalid_token: true };
    }

    const pw_check = await validatePasswordFull(parsed.data.password);

    if (!pw_check.valid) {
      return { status: 400, message: pw_check.errors[0] ?? 'Senha inválida.' };
    }

    const hashed_password = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);

    delete metadata.reset_token;
    delete metadata.login_attempts;
    await UserRepository.update(user.id, { password: hashed_password, metadata });

    await setSessionCookie(user);

    return { status: 200, session: await getSession(), user: await getMe() };
  } catch (error) {
    console.error('resetPassword:', error);
    return { status: 500, message: 'Erro interno do servidor.' };
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_KEY);
}

export async function getSession(): Promise<string | JwtPayload | null> {
  const data: any = (await cookies()).get(COOKIE_KEY);

  if (data?.value) {
    try {
      const access_token = Buffer.from(data.value, 'base64').toString();
      return verifyJWT(access_token, process.env.TOKEN_KEY ?? '');
    } catch {
      return null;
    }
  }

  return null;
}
