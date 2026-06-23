'use server';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { SES } from '@workspace/utils/aws/ses';
import { UserRepository } from '@/repositories/UserRepository';
import { canManageUsers, canManageOwners, type Role } from '@/lib/auth/permissions';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { validatePasswordFull } from '@/lib/auth/password-breach';

import { getMe } from './users';

const BCRYPT_ROUNDS = 10;
const INVITE_PURPOSE = 'team_invite';
const INVITE_EXPIRY = '7d';

const INVITABLE_ROLES: Role[] = ['member', 'admin', 'owner'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteResult = {
  success: boolean;
  invited: number;
  skipped: string[];
  error?: string;
};

export const inviteTeamMembers = async (emailsInput: string[], role: Role = 'member'): Promise<InviteResult> => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, invited: 0, skipped: [], error: 'Usuário não autenticado' };
    }

    if (!canManageUsers(me.role)) {
      return { success: false, invited: 0, skipped: [], error: 'Você não tem permissão para convidar membros.' };
    }

    if (!INVITABLE_ROLES.includes(role)) {
      return { success: false, invited: 0, skipped: [], error: 'Papel inválido.' };
    }

    if (role === 'owner' && !canManageOwners(me.role)) {
      return { success: false, invited: 0, skipped: [], error: 'Você não tem permissão para convidar proprietários.' };
    }

    const workspaceId = await resolveWorkspaceId(me);

    if (!workspaceId) {
      return { success: false, invited: 0, skipped: [], error: 'Workspace não encontrado' };
    }

    const tokenKey = process.env.TOKEN_KEY;

    if (!tokenKey) {
      return { success: false, invited: 0, skipped: [], error: 'TOKEN_KEY não configurada' };
    }

    const baseUrl = process.env.AGENDA_APP_BASE_URL || '';

    const emails = Array.from(new Set(emailsInput.map(e => e.trim().toLowerCase()).filter(e => EMAIL_REGEX.test(e))));

    let invited = 0;
    const skipped: string[] = [];

    for (const email of emails) {
      const existing = await UserRepository.findByEmail(email);

      if (existing) {
        skipped.push(email);
        continue;
      }

      const user = await UserRepository.create({
        name: email.split('@')[0],
        email,
        role,
        workspace_id: workspaceId,
        password: null,
        payload: { invitedBy: me.id, invitedAt: new Date().toISOString() },
      });

      const inviteToken = jwt.sign({ sub: user.id, email, purpose: INVITE_PURPOSE }, tokenKey, {
        expiresIn: INVITE_EXPIRY,
        algorithm: 'HS256',
      });

      const link = `${baseUrl}/invite?token=${inviteToken}`;

      try {
        await SES.send(
          {
            content: `<div style="text-align: center;">Você foi convidado para a equipe. <a href="${link}">Clique aqui</a> para criar sua senha e acessar.</div>`,
          },
          { to: email, subject: 'Convite para a equipe - glhonda' }
        );
      } catch (emailError) {
        console.error('Falha ao enviar e-mail de convite:', emailError);

        return {
          success: false,
          invited,
          skipped,
          error: 'Não foi possível enviar os convites por e-mail. Clique em "Configurar depois" e adicione seu time diretamente nas configurações.',
        };
      }

      invited += 1;
    }

    return { success: true, invited, skipped };
  } catch (error: any) {
    console.error('Error inviting team members:', error);
    return { success: false, invited: 0, skipped: [], error: error?.message || 'Erro ao enviar convites' };
  }
};

type AcceptResult = { success: true; email: string } | { success: false; error: string };

export const acceptInvite = async (token: string, password: string): Promise<AcceptResult> => {
  try {
    const tokenKey = process.env.TOKEN_KEY;

    if (!tokenKey) {
      return { success: false, error: 'TOKEN_KEY não configurada' };
    }

    if (!password) {
      return { success: false, error: 'A senha é obrigatória.' };
    }

    const password_check = await validatePasswordFull(password);

    if (!password_check.valid) {
      return { success: false, error: 'A senha informada não atende aos requisitos de segurança.' };
    }

    const decoded = jwt.verify(token, tokenKey) as { sub?: string; email?: string; purpose?: string };

    if (!decoded || decoded.purpose !== INVITE_PURPOSE || !decoded.sub) {
      return { success: false, error: 'Convite inválido ou expirado.' };
    }

    const user = await UserRepository.findById(decoded.sub);

    if (!user) {
      return { success: false, error: 'Convite inválido.' };
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await UserRepository.update(user.id, { password: hashedPassword });

    return { success: true, email: user.email };
  } catch (error: any) {
    console.error('Error accepting invite:', error);
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, error: 'Convite expirado.' };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, error: 'Convite inválido.' };
    }

    return { success: false, error: 'Erro ao aceitar convite.' };
  }
};
