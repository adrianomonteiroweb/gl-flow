'use server';

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { JwtPayload } from 'jsonwebtoken';

import { findUserByEmail, getMe } from '@/actions/users';
import { createJWT, verifyJWT } from '@workspace/utils/jwt';
import { SES } from '@workspace/utils/aws/ses';
import UserRepository from '@/repositories/UserRepository';

const COOKIE_KEY = 'linharesflow_DOC_AT';
const BCRYPT_ROUNDS = 10;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

const cookieOptions = {
  httpOnly: true,
  path: '/',
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
};

type LoginCode = {
  code_hash: string;
  expires_at: string;
  attempts: number;
  last_sent_at: string;
};

const emailSchema = z.object({
  email: z.string().min(1, { message: 'O e-mail é obrigatório' }).email({ message: 'Formato de e-mail inválido' }),
});

const verifySchema = z.object({
  email: z.string().min(1).email(),
  code: z
    .string()
    .length(6, { message: 'O código deve ter 6 dígitos' })
    .regex(/^\d+$/, { message: 'O código deve conter apenas números' }),
});

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

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendLoginCodeEmail = async (email: string, code: string): Promise<void> => {
  if (!IS_PRODUCTION) {
    console.warn('Código de login:', code);
  }

  try {
    await SES.send(
      {
        content: `
          <div style="text-align: center; font-family: Arial, sans-serif; padding: 24px;">
            <h2 style="margin: 0 0 12px;">Código de acesso</h2>
            <p style="margin: 0; color: #4b5563;">Use o código abaixo para entrar na sua conta:</p>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ff2300; background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px auto; max-width: 280px;">
              ${code}
            </div>
            <p style="margin: 0; color: #6b7280;">Este código expira em ${CODE_TTL_MINUTES} minutos. Se você não solicitou, ignore este e-mail.</p>
          </div>
        `,
      },
      {
        to: email,
        subject: 'Seu código de acesso - Grupo Linhares',
      }
    );
  } catch (error) {
    console.error('Erro ao enviar e-mail de código de login:', error);
  }
};

export async function requestLoginCode(email: string) {
  try {
    const parsed = emailSchema.safeParse({ email });

    if (!parsed.success) {
      return { status: 400, message: 'E-mail inválido.' };
    }

    const user = await findUserByEmail(parsed.data.email);

    if (!user) {
      return { status: 200 };
    }

    const metadata = parseMetadata(user.metadata);
    const existing = metadata.login_code as LoginCode | undefined;

    if (existing?.last_sent_at) {
      const elapsed = Date.now() - new Date(existing.last_sent_at).getTime();
      if (elapsed < RESEND_COOLDOWN_SECONDS * 1000) {
        return { status: 200 };
      }
    }

    const code = generateCode();
    const code_hash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const now = new Date();

    metadata.login_code = {
      code_hash,
      expires_at: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000).toISOString(),
      attempts: 0,
      last_sent_at: now.toISOString(),
    };

    await UserRepository.update(user.id, { metadata });
    await sendLoginCodeEmail(user.email, code);

    return { status: 200 };
  } catch (error) {
    console.error('requestLoginCode:', error);
    return { status: 500, message: 'Erro interno do servidor.' };
  }
}

export async function verifyLoginCode(email: string, code: string) {
  try {
    const parsed = verifySchema.safeParse({ email, code });

    if (!parsed.success) {
      return { status: 400, message: 'Dados inválidos.' };
    }

    const user = await findUserByEmail(parsed.data.email);

    if (!user) {
      return { status: 401, message: 'Código expirado ou inválido.' };
    }

    const metadata = parseMetadata(user.metadata);
    const login_code = metadata.login_code as LoginCode | undefined;

    if (!login_code?.code_hash || !login_code.expires_at) {
      return { status: 401, message: 'Código expirado ou inválido.' };
    }

    if (new Date(login_code.expires_at).getTime() < Date.now()) {
      delete metadata.login_code;
      await UserRepository.update(user.id, { metadata });
      return { status: 401, message: 'Código expirado ou inválido.' };
    }

    if ((login_code.attempts ?? 0) >= MAX_ATTEMPTS) {
      delete metadata.login_code;
      await UserRepository.update(user.id, { metadata });
      return { status: 429, message: 'Muitas tentativas. Solicite um novo código.' };
    }

    const valid = await bcrypt.compare(parsed.data.code, login_code.code_hash);

    if (!valid) {
      login_code.attempts = (login_code.attempts ?? 0) + 1;
      metadata.login_code = login_code;
      await UserRepository.update(user.id, { metadata });
      return { status: 401, message: 'Código inválido.' };
    }

    delete metadata.login_code;
    await UserRepository.update(user.id, { metadata });

    const { access_token } = createJWT(user);

    (await cookies()).set({
      name: COOKIE_KEY,
      value: Buffer.from(access_token).toString('base64'),
      ...cookieOptions,
    });

    return { status: 200, session: await getSession(), user: await getMe() };
  } catch (error) {
    console.error('verifyLoginCode:', error);
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
