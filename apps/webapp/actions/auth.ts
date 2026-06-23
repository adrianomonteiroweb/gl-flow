'use server';

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { JwtPayload } from 'jsonwebtoken';
import { nanoid } from 'nanoid';

import { findUserByEmail, getMe } from '@/actions/users';
import { createJWT, verifyJWT } from '@workspace/utils/jwt';
import { SES } from '@workspace/utils/aws/ses';
import { WorkspaceRepository, FlowConfigRepository, DEFAULT_FLOW_CONFIG, provisionWorkspacePipeline } from '@workspace/db';
import UserRepository from '@/repositories/UserRepository';
import { INITIAL_ONBOARDING_STATE } from '@/lib/onboarding/state';
import { validatePasswordFull } from '@/lib/auth/password-breach';

const COOKIE_KEY = 'glhonda_DOC_AT';
const BCRYPT_ROUNDS = 10;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  path: '/',
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
};

const sha1Hash = (value: string) => crypto.createHash('sha1').update(value).digest('hex');

/** Builds a URL-safe, unique workspace slug from the owner's name. */
const buildWorkspaceSlug = (name: string): string => {
  // NFD splits accented letters into base + combining mark; the [^a-z0-9] filter
  // then drops the combining marks, so no separate diacritics pass is needed.
  const base = (name?.trim().split(' ')[0] || 'empresa')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '');

  return `${base || 'empresa'}-${nanoid(8)}`;
};

export async function createSession(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    return { status: 401 };
  }

  const storedPassword = user?.password || '';

  let valid = false;

  const looks_like_bcrypt = storedPassword.startsWith('$2');

  if (looks_like_bcrypt) {
    valid = await bcrypt.compare(password, storedPassword);
  } else {
    valid = sha1Hash(password) === storedPassword;
    if (valid) {
      const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await UserRepository.update(user.id, { password: newHash });
    }
  }

  if (valid) {
    const { access_token } = createJWT(user);

    (await cookies()).set({
      name: COOKIE_KEY,
      value: Buffer.from(access_token).toString('base64'),
      ...cookieOptions,
    });
    return { status: 200, session: await getSession(), user: await getMe() };
  } else {
    return {
      status: 401,
      error: {
        message: 'Unauthorized',
      },
    };
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_KEY);
}

export async function getSession(): Promise<string | JwtPayload | null> {
  const data: any = (await cookies()).get(COOKIE_KEY);

  if (data) {
    const access_token = Buffer.from(data.value, 'base64').toString();
    return verifyJWT(access_token, process.env.TOKEN_KEY ?? '');
  }

  return null;
}

export async function signUpUser(data: { name: string; email: string; password: string }) {
  try {
    const existing_user = await UserRepository.findByEmail(data.email);

    if (existing_user) {
      return {
        status: 400,
        code: 'email_already_exists',
        message: 'Este e-mail já está cadastrado.',
      };
    }

    const passwordCheck = await validatePasswordFull(data.password);
    if (!passwordCheck.valid) {
      return {
        status: 400,
        code: 'weak_password',
        message: 'A senha informada não atende aos requisitos de segurança.',
      };
    }

    const hashed_password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const first_name = data.name?.trim().split(' ')[0]?.toLowerCase() || 'user';
    const nano_id = nanoid(10);
    const username = `${first_name}-${nano_id}`;

    const { user } = await WorkspaceRepository.transaction(async tx => {
      const workspace = await WorkspaceRepository.create(
        {
          name: data.name,
          slug: buildWorkspaceSlug(data.name),
          payload: { onboarding: INITIAL_ONBOARDING_STATE },
        },
        { tx }
      );

      const created_user = await UserRepository.create(
        {
          name: data.name,
          email: data.email,
          username,
          password: hashed_password,
          role: 'owner',
          workspace_id: workspace.id,
          payload: JSON.stringify({}),
        },
        { tx }
      );

      await FlowConfigRepository.create(
        {
          workspace_id: workspace.id,
          flow_name: 'onboarding',
          is_active: true,
          config: DEFAULT_FLOW_CONFIG,
        },
        { tx }
      );

      await provisionWorkspacePipeline(workspace.id, tx);

      return { workspace, user: created_user };
    });

    const { access_token } = createJWT(user);

    (await cookies()).set({
      name: COOKIE_KEY,
      value: Buffer.from(access_token).toString('base64'),
      ...cookieOptions,
    });
    return { status: 200, session: await getSession(), user: await getMe() };
  } catch (error: unknown) {
    console.error('Erro ao criar usuário:', error);

    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      if (error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string' && error.detail.includes('email')) {
        return {
          status: 400,
          code: 'email_already_exists',
          message: 'Este e-mail já está cadastrado.',
        };
      }
    }

    return {
      status: 500,
      message: 'Erro interno do servidor.',
    };
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const user = await UserRepository.findByEmail(email);

    if (!user) {
      return { status: 404, message: 'E-mail não encontrado.' };
    }

    const token_key = process.env.TOKEN_KEY!;

    if (!token_key) {
      throw new Error('TOKEN_KEY environment variable is not set');
    }

    const resetTokenPayload = {
      sub: user.id,
      email: user.email,
      purpose: 'password_reset',
    };

    const resetToken = jwt.sign(resetTokenPayload, token_key, {
      expiresIn: '1h',
      algorithm: 'HS256',
    });

    const app_url = process.env.AGENDA_APP_BASE_URL || 'https://exmple.com';
    const link = `${app_url}/reset-password?token=${resetToken}`;

    await SES.send(
      {
        content: `<div style="text-align: center;">Olá! <a href="${link}">Clique aqui</a> para recuperar sua senha.</div>`,
      },
      {
        to: user.email,
        subject: `Recuperar senha - glhonda`,
      }
    );

    return {
      status: 200,
      message: 'Link de recuperação enviado para seu e-mail.',
    };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return { status: 500, message: 'Erro interno do servidor.' };
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const token_key = process.env.TOKEN_KEY!;

    if (!token_key) {
      throw new Error('TOKEN_KEY environment variable is not set');
    }

    const decoded = jwt.verify(token, token_key) as any;

    if (!decoded || decoded.purpose !== 'password_reset' || !decoded.sub) {
      return { status: 400, message: 'Token inválido ou expirado.' };
    }

    const passwordCheck = await validatePasswordFull(newPassword);
    if (!passwordCheck.valid) {
      return { status: 400, message: 'A senha informada não atende aos requisitos de segurança.' };
    }

    const hashed_password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await UserRepository.update(decoded.sub, {
      password: hashed_password,
    });

    return { status: 200, message: 'Senha redefinida com sucesso.' };
  } catch (error) {
    console.error('Error resetting password:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return { status: 400, message: 'Token inválido.' };
    }
    if (error instanceof jwt.TokenExpiredError) {
      return { status: 400, message: 'Token expirado.' };
    }

    return { status: 500, message: 'Erro interno do servidor.' };
  }
}

export async function updateUserPassword(userId: string, currentPassword: string, newPassword: string) {
  try {
    const user = await UserRepository.findById(userId);

    if (!user) {
      return { status: 404, message: 'Usuário não encontrado.' };
    }

    const storedPassword = user.password || '';
    const looks_like_bcrypt = storedPassword.startsWith('$2');

    let currentValid = false;

    if (looks_like_bcrypt) {
      currentValid = await bcrypt.compare(currentPassword, storedPassword);
    } else {
      currentValid = sha1Hash(currentPassword) === storedPassword;
    }

    if (!currentValid) {
      return { status: 401, message: 'Senha atual incorreta.' };
    }

    const is_same_password =
      (await bcrypt.compare(newPassword, storedPassword).catch(() => false)) || (!looks_like_bcrypt && sha1Hash(newPassword) === storedPassword);

    if (is_same_password) {
      return { status: 400, message: 'A nova senha não pode ser igual à senha atual.' };
    }

    const passwordCheck = await validatePasswordFull(newPassword);
    if (!passwordCheck.valid) {
      return { status: 400, message: 'A senha informada não atende aos requisitos de segurança.' };
    }

    const new_password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const update_result = await UserRepository.update(userId, { password: new_password_hash });

    if (!update_result || (typeof update_result === 'object' && 'affectedRows' in update_result && update_result.affectedRows === 0)) {
      return { status: 500, message: 'Não foi possível atualizar a senha.' };
    }

    return { status: 200, message: 'Senha atualizada com sucesso.' };
  } catch (error) {
    console.error('Error updating password:', error);
    return { status: 500, message: 'Erro interno do servidor.' };
  }
}
