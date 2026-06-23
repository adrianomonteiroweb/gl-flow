'use server';

import { WorkspaceRepository } from '@workspace/db';
import { canManageUsers } from '@/lib/auth/permissions';

import { getMe } from './users';

export const getWorkspaces = async () => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    if (!canManageUsers(me.role)) {
      return { success: false as const, error: 'Você não tem permissão para listar workspaces.' };
    }

    const workspaces = await WorkspaceRepository.findAll();

    const data = workspaces
      .map((workspace: any) => ({ id: workspace.id, name: workspace.name }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching workspaces:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar workspaces' };
  }
};
