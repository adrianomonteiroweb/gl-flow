'use server';

import { z } from 'zod';
import { and, eq, asc, isNull, count } from 'drizzle-orm';
import {
  db,
  PipelineRepository,
  StepRepository,
  StatusRepository,
  TeamRepository,
  pipelines_table,
  steps_table,
  status_table,
  step_statuses,
  chats_table,
  PIPELINE_STEP_SEED,
  PIPELINE_STATUS_SEED,
  PIPELINE_STEP_STATUS_SEED,
} from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { canAccessSettings } from '@/lib/auth/permissions';
import { getNextPaletteColor } from '@/lib/step-colors';

import { getMe } from './users';

const WORKSPACE_REQUIRED_ERROR = 'Usuário não está vinculado a um workspace';

const NameSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
});

const ReorderSchema = z.array(
  z.object({
    id: z.string(),
    sort_order: z.number().int().min(0),
  })
);

type GuardOk = { workspaceId: string };
type GuardErr = { error: string };

const guard = async (): Promise<GuardOk | GuardErr> => {
  const me = await getMe();

  if (!me) {
    return { error: 'Usuário não autenticado' };
  }

  if (!canAccessSettings(me.role)) {
    return { error: 'Sem permissão para gerenciar pipelines' };
  }

  const workspaceId = await resolveWorkspaceId(me);

  if (!workspaceId) {
    return { error: WORKSPACE_REQUIRED_ERROR };
  }

  return { workspaceId };
};

const findStepInWorkspace = async (id: string, workspaceId: string) => {
  const [step] = await db
    .select()
    .from(steps_table)
    .where(and(eq(steps_table.id, id), eq(steps_table.workspace_id, workspaceId), isNull(steps_table.deleted_at)))
    .limit(1);

  return step ?? null;
};

const findStatusInWorkspace = async (id: string, workspaceId: string) => {
  const [status] = await db
    .select()
    .from(status_table)
    .where(and(eq(status_table.id, id), eq(status_table.workspace_id, workspaceId), isNull(status_table.deleted_at)))
    .limit(1);

  return status ?? null;
};

const countChatsByStep = async (workspaceId: string, stepId: string) => {
  const [row] = await db
    .select({ value: count() })
    .from(chats_table)
    .where(and(eq(chats_table.workspace_id, workspaceId), eq(chats_table.step, stepId), isNull(chats_table.done_at)));

  return row?.value ?? 0;
};

const countChatsByStatus = async (workspaceId: string, statusId: string) => {
  const [row] = await db
    .select({ value: count() })
    .from(chats_table)
    .where(and(eq(chats_table.workspace_id, workspaceId), eq(chats_table.status, statusId), isNull(chats_table.done_at)));

  return row?.value ?? 0;
};

// ─── Pipelines ──────────────────────────────────────────────────────────────

export const getAvailablePipelines = async () => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    const workspaceId = await resolveWorkspaceId(me);

    if (!workspaceId) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const pipelines = await PipelineRepository.findAllByWorkspace(workspaceId);

    let teamPipelineIds: string[] = [];

    if (!canAccessSettings(me.role)) {
      teamPipelineIds = await TeamRepository.findPipelineIdsByUser(me.id);
    }

    return { success: true as const, data: { pipelines, teamPipelineIds } };
  } catch (error: any) {
    console.error('Error fetching available pipelines:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar pipelines' };
  }
};

export const getPipelines = async () => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const data = await PipelineRepository.findAllByWorkspace(auth.workspaceId);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching pipelines:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar pipelines' };
  }
};

export const createPipeline = async (params: { name: string }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const parsed = NameSchema.safeParse(params);

    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const existing = await PipelineRepository.findByWorkspaceAndName(auth.workspaceId, parsed.data.name);

    if (existing) {
      return { success: false as const, error: 'Já existe um pipeline com este nome' };
    }

    const all = await PipelineRepository.findAllByWorkspace(auth.workspaceId);
    const nextOrder = all.length > 0 ? Math.max(...all.map((p: any) => p.sort_order ?? 0)) + 1 : 0;

    const data = await db.transaction(async (tx: any) => {
      const [pipeline] = await tx
        .insert(pipelines_table)
        .values({
          workspace_id: auth.workspaceId,
          name: parsed.data.name,
          sort_order: nextOrder,
          is_default: false,
          is_active: true,
        })
        .returning();

      const stepIdMap: Record<string, string> = {};

      for (const seed of PIPELINE_STEP_SEED) {
        const [step] = await tx
          .insert(steps_table)
          .values({
            pipeline_id: pipeline.id,
            workspace_id: auth.workspaceId,
            name: seed.name,
            slug: seed.slug,
            order: seed.order,
            color: seed.color,
            is_system: false,
            is_active: true,
          })
          .returning();

        stepIdMap[seed.slug] = step.id;
      }

      const statusIdMap: Record<string, string> = {};

      for (const seed of PIPELINE_STATUS_SEED) {
        const [found] = await tx
          .select({ id: status_table.id })
          .from(status_table)
          .where(and(eq(status_table.workspace_id, auth.workspaceId), eq(status_table.slug, seed.slug), isNull(status_table.deleted_at)))
          .limit(1);

        if (found) {
          statusIdMap[seed.slug] = found.id;
        } else {
          const [created] = await tx
            .insert(status_table)
            .values({
              workspace_id: auth.workspaceId,
              name: seed.name,
              slug: seed.slug,
              is_universal: seed.is_universal,
              is_system: false,
              is_active: true,
            })
            .returning();

          statusIdMap[seed.slug] = created.id;
        }
      }

      for (const link of PIPELINE_STEP_STATUS_SEED) {
        const stepId = stepIdMap[link.step_slug];
        const statusId = statusIdMap[link.status_slug];

        if (stepId && statusId) {
          await tx.insert(step_statuses).values({ step_id: stepId, status_id: statusId }).onConflictDoNothing();
        }
      }

      return pipeline;
    });

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating pipeline:', error);
    return { success: false as const, error: error?.message || 'Erro ao criar pipeline' };
  }
};

export const updatePipeline = async (id: string, params: { name?: string; is_active?: boolean }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const pipeline = await PipelineRepository.findById(id);

    if (!pipeline || pipeline.workspace_id !== auth.workspaceId || pipeline.deleted_at) {
      return { success: false as const, error: 'Pipeline não encontrado' };
    }

    if (params.name && params.name !== pipeline.name) {
      const existing = await PipelineRepository.findByWorkspaceAndName(auth.workspaceId, params.name);

      if (existing) {
        return { success: false as const, error: 'Já existe um pipeline com este nome' };
      }
    }

    const updateData: Record<string, unknown> = {};

    if (params.name !== undefined) {
      updateData.name = params.name;
    }

    if (params.is_active !== undefined) {
      updateData.is_active = params.is_active;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true as const, data: pipeline };
    }

    const data = await PipelineRepository.update(id, updateData);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating pipeline:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar pipeline' };
  }
};

export const deletePipeline = async (id: string) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const pipeline = await PipelineRepository.findById(id);

    if (!pipeline || pipeline.workspace_id !== auth.workspaceId || pipeline.deleted_at) {
      return { success: false as const, error: 'Pipeline não encontrado' };
    }

    if (pipeline.is_default) {
      return { success: false as const, error: 'O pipeline padrão não pode ser excluído' };
    }

    const fallback = await PipelineRepository.findDefaultByWorkspace(auth.workspaceId);

    await db.transaction(async (tx: any) => {
      if (fallback) {
        const [firstStep] = await tx
          .select()
          .from(steps_table)
          .where(and(eq(steps_table.workspace_id, auth.workspaceId), eq(steps_table.pipeline_id, fallback.id), isNull(steps_table.deleted_at)))
          .orderBy(asc(steps_table.order))
          .limit(1);

        await tx
          .update(chats_table)
          .set({ pipeline_id: fallback.id, ...(firstStep ? { step: firstStep.id } : {}), updated_at: new Date() })
          .where(and(eq(chats_table.workspace_id, auth.workspaceId), eq(chats_table.pipeline_id, id)));
      }

      await tx.update(pipelines_table).set({ deleted_at: new Date().toISOString(), updated_at: new Date() }).where(eq(pipelines_table.id, id));
    });

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error deleting pipeline:', error);
    return { success: false as const, error: error?.message || 'Erro ao excluir pipeline' };
  }
};

export const reorderPipelines = async (items: { id: string; sort_order: number }[]) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const parsed = ReorderSchema.safeParse(items);

    if (!parsed.success) {
      return { success: false as const, error: 'Dados inválidos' };
    }

    const owned = await PipelineRepository.findAllByWorkspace(auth.workspaceId);
    const ownedIds = new Set(owned.map((p: any) => p.id));

    if (parsed.data.some(item => !ownedIds.has(item.id))) {
      return { success: false as const, error: 'Pipeline inválido' };
    }

    await PipelineRepository.reorder(parsed.data);

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error reordering pipelines:', error);
    return { success: false as const, error: error?.message || 'Erro ao reordenar pipelines' };
  }
};

// ─── Stages (steps) ───────────────────────────────────────────────────────────

export const getPipelineStages = async (pipelineId: string) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const pipeline = await PipelineRepository.findById(pipelineId);

    if (!pipeline || pipeline.workspace_id !== auth.workspaceId || pipeline.deleted_at) {
      return { success: false as const, error: 'Pipeline não encontrado' };
    }

    const data = await StepRepository.findStagesByPipeline(auth.workspaceId, pipelineId);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching pipeline stages:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar etapas' };
  }
};

export const createStage = async (pipelineId: string, params: { name: string }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const parsed = NameSchema.safeParse(params);

    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const pipeline = await PipelineRepository.findById(pipelineId);

    if (!pipeline || pipeline.workspace_id !== auth.workspaceId || pipeline.deleted_at) {
      return { success: false as const, error: 'Pipeline não encontrado' };
    }

    const stages = await StepRepository.findAllByPipeline(auth.workspaceId, pipelineId);
    const nextOrder = stages.reduce((max: number, s: any) => Math.max(max, Number(s.order) || 0), 0) + 1;
    const existingColors = stages.map((s: { color?: string | null }) => s.color ?? null);

    const data = await StepRepository.create({
      workspace_id: auth.workspaceId,
      pipeline_id: pipelineId,
      name: parsed.data.name,
      order: String(nextOrder),
      color: getNextPaletteColor(existingColors),
      is_system: false,
      is_active: true,
    });

    return { success: true as const, data: { ...data, statuses: [] } };
  } catch (error: any) {
    console.error('Error creating stage:', error);
    return { success: false as const, error: error?.message || 'Erro ao criar etapa' };
  }
};

export const updateStage = async (id: string, params: { name?: string; is_active?: boolean; color?: string }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const step = await findStepInWorkspace(id, auth.workspaceId);

    if (!step) {
      return { success: false as const, error: 'Etapa não encontrada' };
    }

    const updateData: Record<string, unknown> = {};

    if (params.name !== undefined) {
      updateData.name = params.name;
    }

    if (params.is_active !== undefined) {
      updateData.is_active = params.is_active;
    }

    if (params.color !== undefined) {
      updateData.color = params.color;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true as const, data: step };
    }

    const data = await StepRepository.update(id, updateData);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating stage:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar etapa' };
  }
};

export const deleteStage = async (id: string, options?: { targetStepId?: string; targetStepName?: string }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const step = await findStepInWorkspace(id, auth.workspaceId);

    if (!step) {
      return { success: false as const, error: 'Etapa não encontrada' };
    }

    if (!step.pipeline_id) {
      return { success: false as const, error: 'Etapa inválida' };
    }

    const stepPipelineId = step.pipeline_id;

    const chatCount = await countChatsByStep(auth.workspaceId, id);
    const target = options?.targetStepId?.trim();
    const targetName = options?.targetStepName?.trim();

    if (chatCount > 0 && !target && !targetName) {
      return { success: false as const, requiresTarget: true as const, chatCount, isSystem: step.is_system };
    }

    if (target && target === id) {
      return { success: false as const, error: 'A etapa de destino deve ser diferente' };
    }

    if (target) {
      const targetStep = await findStepInWorkspace(target, auth.workspaceId);
      if (!targetStep) {
        return { success: false as const, error: 'Etapa de destino inválida' };
      }
    }

    await db.transaction(async (tx: any) => {
      let targetId = target;

      if (!targetId && targetName) {
        const stages = await tx
          .select()
          .from(steps_table)
          .where(and(eq(steps_table.workspace_id, auth.workspaceId), eq(steps_table.pipeline_id, stepPipelineId), isNull(steps_table.deleted_at)));
        const nextOrder = stages.reduce((max: number, s: any) => Math.max(max, Number(s.order) || 0), 0) + 1;

        const [created] = await tx
          .insert(steps_table)
          .values({
            workspace_id: auth.workspaceId,
            pipeline_id: stepPipelineId,
            name: targetName,
            order: String(nextOrder),
            color: 'blue',
            is_system: false,
            is_active: true,
          })
          .returning();
        targetId = created.id;
      }

      if (targetId && chatCount > 0) {
        await tx
          .update(chats_table)
          .set({ step: targetId, updated_at: new Date() })
          .where(and(eq(chats_table.workspace_id, auth.workspaceId), eq(chats_table.step, id)));
      }

      await tx.update(steps_table).set({ deleted_at: new Date().toISOString(), updated_at: new Date() }).where(eq(steps_table.id, id));
    });

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error deleting stage:', error);
    return { success: false as const, error: error?.message || 'Erro ao excluir etapa' };
  }
};

export const reorderStages = async (pipelineId: string, items: { id: string; order: number }[]) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const stages = await StepRepository.findAllByPipeline(auth.workspaceId, pipelineId);
    const ownedIds = new Set(stages.map((s: any) => s.id));

    if (items.some(item => !ownedIds.has(item.id))) {
      return { success: false as const, error: 'Etapa inválida' };
    }

    await StepRepository.reorder(items);

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error reordering stages:', error);
    return { success: false as const, error: error?.message || 'Erro ao reordenar etapas' };
  }
};

// ─── Statuses ──────────────────────────────────────────────────────────────

export const createStatus = async (stepId: string, params: { name: string }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const parsed = NameSchema.safeParse(params);

    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const step = await findStepInWorkspace(stepId, auth.workspaceId);

    if (!step) {
      return { success: false as const, error: 'Etapa não encontrada' };
    }

    const status = await StatusRepository.create({
      workspace_id: auth.workspaceId,
      name: parsed.data.name,
      is_universal: false,
      is_system: false,
      is_active: true,
    });

    const sortOrder = await StatusRepository.nextSortOrderForStep(stepId);
    await StatusRepository.linkToStep(stepId, status.id, sortOrder);

    return { success: true as const, data: status };
  } catch (error: any) {
    console.error('Error creating status:', error);
    return { success: false as const, error: error?.message || 'Erro ao criar status' };
  }
};

export const updateStatus = async (id: string, params: { name?: string; is_active?: boolean; color?: string | null }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const status = await findStatusInWorkspace(id, auth.workspaceId);

    if (!status) {
      return { success: false as const, error: 'Status não encontrado' };
    }

    const updateData: Record<string, unknown> = {};

    if (params.name !== undefined) {
      updateData.name = params.name;
    }

    if (params.is_active !== undefined) {
      updateData.is_active = params.is_active;
    }

    if (params.color !== undefined) {
      updateData.color = params.color;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true as const, data: status };
    }

    const data = await StatusRepository.update(id, updateData);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating status:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar status' };
  }
};

export const updateStepStatusColor = async (stepId: string, statusId: string, color: string | null) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const step = await findStepInWorkspace(stepId, auth.workspaceId);

    if (!step) {
      return { success: false as const, error: 'Etapa não encontrada' };
    }

    const status = await findStatusInWorkspace(statusId, auth.workspaceId);

    if (!status) {
      return { success: false as const, error: 'Status não encontrado' };
    }

    await StatusRepository.updateStepStatusColor(stepId, statusId, color);

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error updating step status color:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar cor do status' };
  }
};

export const removeStatusFromStage = async (stepId: string, statusId: string, options?: { targetStatusId?: string; targetStatusName?: string }) => {
  try {
    const auth = await guard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const step = await findStepInWorkspace(stepId, auth.workspaceId);

    if (!step) {
      return { success: false as const, error: 'Etapa não encontrada' };
    }

    const status = await findStatusInWorkspace(statusId, auth.workspaceId);

    if (!status) {
      return { success: false as const, error: 'Status não encontrado' };
    }

    const links = await db.select().from(step_statuses).where(eq(step_statuses.status_id, statusId));
    const linkedSteps = new Set(links.map((l: any) => l.step_id));
    const sharedOrUniversal = status.is_universal || linkedSteps.size > 1;

    if (sharedOrUniversal) {
      await StatusRepository.unlinkFromStep(stepId, statusId);
      return { success: true as const, data: null };
    }

    const chatCount = await countChatsByStatus(auth.workspaceId, statusId);
    const target = options?.targetStatusId?.trim();
    const targetName = options?.targetStatusName?.trim();

    if (chatCount > 0 && !target && !targetName) {
      return { success: false as const, requiresTarget: true as const, chatCount, isSystem: status.is_system };
    }

    if (target) {
      const targetStatus = await findStatusInWorkspace(target, auth.workspaceId);

      if (!targetStatus) {
        return { success: false as const, error: 'Status de destino inválido' };
      }
    }

    await db.transaction(async (tx: any) => {
      let targetId = target;

      if (!targetId && targetName) {
        const [created] = await tx
          .insert(status_table)
          .values({ workspace_id: auth.workspaceId, name: targetName, is_universal: false, is_system: false, is_active: true })
          .returning();
        targetId = created.id;
        await tx.insert(step_statuses).values({ step_id: stepId, status_id: targetId, sort_order: 0 }).onConflictDoNothing();
      }

      if (targetId && chatCount > 0) {
        await tx
          .update(chats_table)
          .set({ status: targetId, updated_at: new Date() })
          .where(and(eq(chats_table.workspace_id, auth.workspaceId), eq(chats_table.status, statusId)));
      }

      await tx.delete(step_statuses).where(eq(step_statuses.status_id, statusId));
      await tx.update(status_table).set({ deleted_at: new Date().toISOString(), updated_at: new Date() }).where(eq(status_table.id, statusId));
    });

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error removing status from stage:', error);
    return { success: false as const, error: error?.message || 'Erro ao remover status' };
  }
};
