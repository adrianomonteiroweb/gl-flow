'use server';

import { z } from 'zod';
import { TeamRepository } from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { canAccessSettings } from '@/lib/auth/permissions';

import { getMe } from './users';

const NameSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
});

type GuardOk = { workspaceId: string; userId: string };
type GuardErr = { error: string };

const guard = async (): Promise<GuardOk | GuardErr> => {
  const me = await getMe();

  if (!me) {
    return { error: 'Usuário não autenticado' };
  }

  if (!canAccessSettings(me.role)) {
    return { error: 'Sem permissão para gerenciar times' };
  }

  const workspaceId = await resolveWorkspaceId(me);

  if (!workspaceId) {
    return { error: 'Workspace não encontrado' };
  }

  return { workspaceId, userId: me.id };
};

export const getTeams = async () => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const data = await TeamRepository.findAllByWorkspace(auth.workspaceId);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching teams:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar times' };
  }
};

export const getTeam = async (id: string) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const data = await TeamRepository.findByIdWithDetails(id);

    if (!data || data.workspace_id !== auth.workspaceId) {
      return { success: false as const, error: 'Time não encontrado' };
    }

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching team:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar time' };
  }
};

export const createTeam = async (params: { name: string }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const parsed = NameSchema.safeParse(params);

    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const data = await TeamRepository.create({
      workspace_id: auth.workspaceId,
      name: parsed.data.name,
    });

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating team:', error);

    if (error?.message?.includes('uq_team_workspace_name')) {
      return { success: false as const, error: 'Já existe um time com este nome' };
    }

    return { success: false as const, error: error?.message || 'Erro ao criar time' };
  }
};

export const updateTeam = async (id: string, params: { name: string }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const parsed = NameSchema.safeParse(params);

    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const existing = await TeamRepository.findByIdWithDetails(id);

    if (!existing || existing.workspace_id !== auth.workspaceId) {
      return { success: false as const, error: 'Time não encontrado' };
    }

    const data = await TeamRepository.update(id, { name: parsed.data.name });

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating team:', error);

    if (error?.message?.includes('uq_team_workspace_name')) {
      return { success: false as const, error: 'Já existe um time com este nome' };
    }

    return { success: false as const, error: error?.message || 'Erro ao atualizar time' };
  }
};

export const deleteTeam = async (id: string) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const existing = await TeamRepository.findByIdWithDetails(id);

    if (!existing || existing.workspace_id !== auth.workspaceId) {
      return { success: false as const, error: 'Time não encontrado' };
    }

    await TeamRepository.softDelete(id);

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error deleting team:', error);
    return { success: false as const, error: error?.message || 'Erro ao excluir time' };
  }
};

export const setTeamMembers = async (teamId: string, userIds: string[]) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const existing = await TeamRepository.findByIdWithDetails(teamId);

    if (!existing || existing.workspace_id !== auth.workspaceId) {
      return { success: false as const, error: 'Time não encontrado' };
    }

    await TeamRepository.setMembers(teamId, userIds);

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error setting team members:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar membros' };
  }
};

export const setTeamPipelines = async (teamId: string, pipelineIds: string[]) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const existing = await TeamRepository.findByIdWithDetails(teamId);

    if (!existing || existing.workspace_id !== auth.workspaceId) {
      return { success: false as const, error: 'Time não encontrado' };
    }

    await TeamRepository.setPipelines(teamId, pipelineIds);

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error setting team pipelines:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar pipelines' };
  }
};

export const getMyTeamPipelineIds = async (): Promise<{ success: boolean; data?: string[]; error?: string }> => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const data = await TeamRepository.findPipelineIdsByUser(me.id);

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching team pipeline ids:', error);
    return { success: false, error: error?.message || 'Erro ao carregar pipelines do time' };
  }
};
