'use server';

import { z } from 'zod';
import { LossReasonRepository, WorkspaceRepository } from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { getMe } from './users';

const CreateLossReasonSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
});

const UpdateLossReasonSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo').optional(),
  is_active: z.boolean().optional(),
});

const ReorderSchema = z.array(
  z.object({
    id: z.string(),
    sort_order: z.number().int().min(0),
  })
);

const WORKSPACE_REQUIRED_ERROR = 'Usuário não está vinculado a um workspace';

export const getLossReasons = async () => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const data = await LossReasonRepository.findAllByWorkspace(workspaceId);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching loss reasons:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar motivos de perda' };
  }
};

export const getActiveLossReasons = async () => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const data = await LossReasonRepository.findActiveByWorkspace(workspaceId);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching active loss reasons:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar motivos de perda' };
  }
};

export const createLossReason = async (params: { name: string }) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const parsed = CreateLossReasonSchema.safeParse(params);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    const existing = await LossReasonRepository.findByWorkspaceAndName(workspaceId, parsed.data.name);
    if (existing) {
      return { success: false as const, error: 'Já existe um motivo com este nome' };
    }

    const all = await LossReasonRepository.findAllByWorkspace(workspaceId);
    const nextOrder = all.length > 0 ? Math.max(...all.map((r: any) => r.sort_order ?? 0)) + 1 : 0;

    const data = await LossReasonRepository.create({
      ...parsed.data,
      workspace_id: workspaceId,
      sort_order: nextOrder,
    });

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating loss reason:', error);
    return { success: false as const, error: error?.message || 'Erro ao criar motivo de perda' };
  }
};

export const updateLossReason = async (id: string, params: { name?: string; is_active?: boolean }) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const reason = await LossReasonRepository.findById(id);
    if (!reason || reason.workspace_id !== workspaceId) {
      return { success: false as const, error: 'Motivo de perda não encontrado' };
    }

    const parsed = UpdateLossReasonSchema.safeParse(params);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    if (parsed.data.name && parsed.data.name !== reason.name) {
      const existing = await LossReasonRepository.findByWorkspaceAndName(workspaceId, parsed.data.name);
      if (existing) {
        return { success: false as const, error: 'Já existe um motivo com este nome' };
      }
    }

    const updateData: Record<string, any> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updateData[key] = value;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true as const, data: null };
    }

    const data = await LossReasonRepository.update(id, updateData);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating loss reason:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar motivo de perda' };
  }
};

export const deleteLossReason = async (id: string) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const reason = await LossReasonRepository.findById(id);
    if (!reason || reason.workspace_id !== workspaceId) {
      return { success: false as const, error: 'Motivo de perda não encontrado' };
    }

    const data = await LossReasonRepository.softDelete(id);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error deleting loss reason:', error);
    return { success: false as const, error: error?.message || 'Erro ao remover motivo de perda' };
  }
};

export const reorderLossReasons = async (items: { id: string; sort_order: number }[]) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const parsed = ReorderSchema.safeParse(items);
    if (!parsed.success) {
      return { success: false as const, error: 'Dados inválidos' };
    }

    await LossReasonRepository.reorder(parsed.data);
    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error reordering loss reasons:', error);
    return { success: false as const, error: error?.message || 'Erro ao reordenar motivos de perda' };
  }
};

export const getAllowFreeformLossReasons = async () => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const workspace = await WorkspaceRepository.findById(workspaceId);
    const metadata = (workspace?.metadata ?? {}) as Record<string, any>;
    const allow = metadata.allowFreeformLossReasons ?? true;

    return { success: true as const, data: allow };
  } catch (error: any) {
    console.error('Error fetching freeform loss reasons setting:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar configuração' };
  }
};

export const toggleFreeformLossReasons = async (allow: boolean) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const workspace = await WorkspaceRepository.findById(workspaceId);
    const metadata = (workspace?.metadata ?? {}) as Record<string, any>;

    await WorkspaceRepository.update(workspaceId, {
      metadata: { ...metadata, allowFreeformLossReasons: allow },
    });

    return { success: true as const, data: allow };
  } catch (error: any) {
    console.error('Error toggling freeform loss reasons:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar configuração' };
  }
};
