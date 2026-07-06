'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { GetUserParams, UserRepository } from '@/repositories/UserRepository';
import { onlyNumbers } from '@workspace/utils/text';
import { canManageUsers, canManageOwners } from '@/lib/auth/permissions';
import { resolveWorkspaceId, getDefaultWorkspaceId } from '@/lib/workspaces/development-workspace';
import { validatePasswordFull } from '@/lib/auth/password-breach';

import { getSession } from './auth';

export async function getMe(): Promise<any | null> {
  const session = await getSession();

  if (!session || typeof session === 'string' || !session.sub) {
    return null;
  }

  return (await UserRepository.findById(session.sub)) || null;
}

export async function findUserByEmail(email: string) {
  return await UserRepository.findByEmail(email);
}

export async function getUser(id: number | string) {
  return await UserRepository.findById(id);
}

export async function getUsers(params: Omit<GetUserParams, 'workspace_id'>) {
  const me = await getMe();
  const workspace_id = await resolveWorkspaceId(me);

  if (!workspace_id) {
    return { count: 0, data: [] };
  }

  return await UserRepository.getUsers({ ...params, workspace_id, current_user_id: me?.id });
}

export async function createUser(data: any) {
  try {
    const me = await getMe();

    if (!me) {
      throw new Error('Usuário não autenticado');
    }

    if (!canManageUsers(me.role)) {
      return { status: 403, message: 'Você não tem permissão para gerenciar usuários.' };
    }

    if (data.role === 'owner' && !canManageOwners(me.role)) {
      return { status: 403, message: 'Você não tem permissão para definir o papel de Proprietário.' };
    }

    if (!data.name || !data.email) {
      throw new Error('Nome e email são obrigatórios');
    }

    if (data.password) {
      const passwordCheck = await validatePasswordFull(data.password);
      if (!passwordCheck.valid) {
        return { status: 400, message: passwordCheck.errors[0] ?? 'Senha muito fraca.' };
      }
      data.password = await bcrypt.hash(data.password, 10);
    }

    if (!data.payload) {
      data.payload = {};
    }

    const workspace_id = data.workspace_id || me.workspace_id || (await getDefaultWorkspaceId());

    const sanitizedData = {
      ...data,
      phone: data.phone && onlyNumbers(data.phone),
      payload: JSON.stringify(data.payload),
      workspace_id,
    };

    const createdUser = await UserRepository.create(sanitizedData);

    return { status: 200, data: createdUser };
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    if (error.constraint === 'users_email_unique') {
      return { status: 400, message: 'Já existe um usuário com este email cadastrado.' };
    }

    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function updateUser(id: number | string, data: any) {
  try {
    const me = await getMe();

    if (!me) {
      throw new Error('Usuário não autenticado');
    }

    if (!canManageUsers(me.role)) {
      throw new Error('Você não tem permissão para gerenciar usuários.');
    }

    const user = await UserRepository.findById(id);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if ((user.role === 'owner' || data.role === 'owner') && !canManageOwners(me.role)) {
      throw new Error('Você não tem permissão para alterar um Proprietário.');
    }

    delete data.password;
    delete data.password_confirmation; // Remove a confirmação de senha, se existir

    if (data.workspace_id === '') {
      data.workspace_id = null;
    }

    data.payload = {
      ...user.payload,
      ...data.payload,
    };

    data.phone = data.phone && onlyNumbers(data.phone);
    data.document_number = data.document_number && onlyNumbers(data.document_number);

    return await UserRepository.update(id, data);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    throw error;
  }
}

export async function removeUser(id: string) {
  const me = await getMe();

  if (!me) {
    throw new Error('Usuário não autenticado');
  }

  if (!canManageUsers(me.role)) {
    throw new Error('Você não tem permissão para remover usuários.');
  }

  const target = await UserRepository.findById(id);

  if (target?.role === 'owner' && !canManageOwners(me.role)) {
    throw new Error('Você não tem permissão para remover um Proprietário.');
  }

  return await UserRepository.deleteById(id);
}

export async function updateMe(data: any) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    if (!data.name || !data.email) {
      return { status: 400, message: 'Nome e email são obrigatórios' };
    }

    // Verifica se o email já está em uso por outro usuário
    if (data.email !== me.email) {
      const existingUser = await UserRepository.findByEmail(data.email);

      if (existingUser) {
        return { status: 400, code: 'email_already_exists', message: 'Este email já está cadastrado' };
      }
    }

    const updatedData = {
      name: data.name,
      email: data.email,
    };

    await UserRepository.update(me.id, updatedData);

    return { status: 200, message: 'Informações atualizadas com sucesso' };
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function updatePassword(data: any) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    if (!data.currentPassword || !data.newPassword) {
      return { status: 400, message: 'Senha atual e nova senha são obrigatórias' };
    }

    // Verifica se a senha atual está correta (suporta bcrypt e SHA1 legado)
    const sha1 = (v: string) => crypto.createHash('sha1').update(v).digest('hex');
    const isBcrypt = me.password?.startsWith('$2');
    const valid = isBcrypt ? await bcrypt.compare(data.currentPassword, me.password) : sha1(data.currentPassword) === me.password;

    if (!valid) {
      return { status: 401, code: 'invalid_password', message: 'Senha atual incorreta' };
    }

    const passwordCheck = await validatePasswordFull(data.newPassword);
    if (!passwordCheck.valid) {
      return { status: 400, message: passwordCheck.errors[0] ?? 'Senha muito fraca.' };
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

    await UserRepository.update(me.id, { password: hashedNewPassword });

    return { status: 200, message: 'Senha alterada com sucesso' };
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function adminUpdateUserPassword(targetUserId: string, newPassword: string, confirmPassword: string) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const isAuthorized = me.role === 'admin' || me.role === 'owner';

    if (!isAuthorized) {
      return { status: 403, code: 'forbidden', message: 'Você não tem permissão para alterar a senha de outros usuários.' };
    }

    if (!newPassword) {
      return { status: 400, code: 'invalid_password', message: 'A nova senha é obrigatória.' };
    }

    const passwordCheck = await validatePasswordFull(newPassword);
    if (!passwordCheck.valid) {
      return { status: 400, code: 'invalid_password', message: passwordCheck.errors[0] ?? 'Senha muito fraca.' };
    }

    if (newPassword !== confirmPassword) {
      return { status: 400, code: 'password_mismatch', message: 'As senhas não coincidem.' };
    }

    const target = await UserRepository.findById(targetUserId);

    if (!target) {
      return { status: 404, message: 'Usuário não encontrado.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await UserRepository.update(targetUserId, { password: hashedPassword });

    return { status: 200, message: 'Senha alterada com sucesso.' };
  } catch (error: any) {
    console.error('Erro ao alterar senha do usuário:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado ao alterar a senha.' };
  }
}

export async function searchUsers(searchTerm: string = '') {
  const me = await getMe();

  if (!me) {
    throw new Error('Usuário não autenticado');
  }

  const workspaceId = await resolveWorkspaceId(me);

  if (!workspaceId) {
    return [];
  }

  return (await UserRepository.search(workspaceId, searchTerm)).filter((user: any) => user.id !== me.id);
}
