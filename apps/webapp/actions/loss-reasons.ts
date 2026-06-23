'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { LossReasonRepository, WorkspaceRepository } from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { canAccessSettings } from '@/lib/auth/permissions';

import { getMe } from './users';

const WORKSPACE_REQUIRED_ERROR = 'Usuário não está vinculado a um workspace';
const FORBIDDEN_ERROR = 'Você não tem permissão para gerenciar motivos de perda';

const NameSchema = z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo');

export const getLossReasons = async () => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const data = await LossReasonRepository.findAllByWorkspace(workspace_id);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching loss reasons:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar motivos de perda' };
  }
};

export const getActiveLossReasons = async () => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const data = await LossReasonRepository.findActiveByWorkspace(workspace_id);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching active loss reasons:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar motivos de perda' };
  }
};

export const createLossReason = async (params: { name: string }) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    if (!canAccessSettings(me.role)) {
      return { success: false as const, error: FORBIDDEN_ERROR };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const parsed = NameSchema.safeParse(params.name);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    const existing = await LossReasonRepository.findByWorkspaceAndName(workspace_id, parsed.data);

    if (existing) {
      return { success: false as const, error: 'Já existe um motivo com esse nome' };
    }

    const current = await LossReasonRepository.findAllByWorkspace(workspace_id);

    const data = await LossReasonRepository.create({
      workspace_id,
      name: parsed.data,
      sort_order: current.length,
    });

    revalidatePath('/settings', 'layout');

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating loss reason:', error);
    return { success: false as const, error: error?.message || 'Erro ao criar motivo de perda' };
  }
};

export const updateLossReason = async (id: string, params: { name?: string; is_active?: boolean }) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    if (!canAccessSettings(me.role)) {
      return { success: false as const, error: FORBIDDEN_ERROR };
    }

    const update_data: Record<string, unknown> = {};

    if (params.name !== undefined) {
      const parsed = NameSchema.safeParse(params.name);

      if (!parsed.success) {
        const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
        return { success: false as const, error: message };
      }

      update_data.name = parsed.data;
    }

    if (params.is_active !== undefined) {
      update_data.is_active = params.is_active;
    }

    if (Object.keys(update_data).length === 0) {
      return { success: true as const, data: null };
    }

    const data = await LossReasonRepository.update(id, update_data);

    revalidatePath('/settings', 'layout');

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating loss reason:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar motivo de perda' };
  }
};

export const deleteLossReason = async (id: string) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    if (!canAccessSettings(me.role)) {
      return { success: false as const, error: FORBIDDEN_ERROR };
    }

    const data = await LossReasonRepository.softDelete(id);

    revalidatePath('/settings', 'layout');

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error deleting loss reason:', error);
    return { success: false as const, error: error?.message || 'Erro ao remover motivo de perda' };
  }
};

export const reorderLossReasons = async (items: { id: string; sort_order: number }[]) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    if (!canAccessSettings(me.role)) {
      return { success: false as const, error: FORBIDDEN_ERROR };
    }

    await LossReasonRepository.reorder(items);

    revalidatePath('/settings', 'layout');

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error reordering loss reasons:', error);
    return { success: false as const, error: error?.message || 'Erro ao reordenar motivos de perda' };
  }
};

export const getAllowFreeformLossReasons = async () => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const workspace = await WorkspaceRepository.findById(workspace_id);
    const allow = (workspace?.metadata as any)?.allow_freeform_loss_reasons;

    return { success: true as const, data: allow === undefined ? true : !!allow };
  } catch (error: any) {
    console.error('Error fetching freeform setting:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar configuração' };
  }
};

export const toggleFreeformLossReasons = async (allow: boolean) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    if (!canAccessSettings(me.role)) {
      return { success: false as const, error: FORBIDDEN_ERROR };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const workspace = await WorkspaceRepository.findById(workspace_id);
    const metadata = { ...((workspace?.metadata as any) ?? {}), allow_freeform_loss_reasons: allow };

    await WorkspaceRepository.update(workspace_id, { metadata });

    revalidatePath('/settings', 'layout');

    return { success: true as const, data: allow };
  } catch (error: any) {
    console.error('Error toggling freeform setting:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar configuração' };
  }
};
