'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { TaskRepository } from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { LeadActivityLogger } from '@/lib/activities/lead-activity-logger';

import { getMe } from './users';

const WORKSPACE_REQUIRED_ERROR = 'Usuário não está vinculado a um workspace';

const CreateTaskSchema = z.object({
  leadId: z.string().min(1),
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().max(1000).optional(),
  dueDate: z.string().min(1, 'Prazo é obrigatório'),
});

type CreateTaskParams = z.infer<typeof CreateTaskSchema>;

export const getLeadTasks = async (leadId: string) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const data = await TaskRepository.findAllByLead(leadId);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar tarefas' };
  }
};

export const createTask = async (params: CreateTaskParams) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const parsed = CreateTaskSchema.safeParse(params);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    const data = await TaskRepository.create({
      workspace_id,
      lead_id: parsed.data.leadId,
      assignee_id: me.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      due_date: new Date(parsed.data.dueDate).toISOString(),
    });

    LeadActivityLogger.log({
      workspace_id,
      lead_id: parsed.data.leadId,
      type: 'task_created',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { taskId: data?.id, title: parsed.data.title, dueDate: parsed.data.dueDate },
    });

    revalidatePath('/pipelines', 'layout');

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating task:', error);
    return { success: false as const, error: error?.message || 'Erro ao criar tarefa' };
  }
};

export const toggleTask = async (taskId: string) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const task = await TaskRepository.findById(taskId);

    if (!task || task.workspace_id !== workspace_id) {
      return { success: false as const, error: 'Tarefa não encontrada' };
    }

    const data = await TaskRepository.toggleComplete(taskId);

    LeadActivityLogger.log({
      workspace_id,
      lead_id: task.lead_id,
      type: data?.completed_at ? 'task_completed' : 'task_reopened',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { taskId, title: task.title },
    });

    revalidatePath('/pipelines', 'layout');

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error toggling task:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar tarefa' };
  }
};

const ENRICHMENT_TASK_TITLE = 'Prospectar e Enriquecer Lead';

export const completeLeadEnrichmentTask = async (leadId: string) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const tasks = await TaskRepository.findAllByLead(leadId);
    const target = tasks.find(t => t.title === ENRICHMENT_TASK_TITLE && !t.completed_at);

    if (!target) {
      return { success: true as const };
    }

    const data = await TaskRepository.update(target.id, { completed_at: new Date().toISOString() });

    LeadActivityLogger.log({
      workspace_id,
      lead_id: leadId,
      type: 'task_completed',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { taskId: target.id, title: ENRICHMENT_TASK_TITLE },
    });

    revalidatePath('/pipelines', 'layout');

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error completing enrichment task:', error);
    return { success: false as const, error: error?.message || 'Erro ao completar tarefa' };
  }
};

export const deleteTask = async (taskId: string) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuário não autenticado' };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };
    }

    const task = await TaskRepository.findById(taskId);

    if (!task || task.workspace_id !== workspace_id) {
      return { success: false as const, error: 'Tarefa não encontrada' };
    }

    await TaskRepository.deleteById(taskId);

    LeadActivityLogger.log({
      workspace_id,
      lead_id: task.lead_id,
      type: 'task_deleted',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { taskId, title: task.title },
    });

    revalidatePath('/pipelines', 'layout');

    return { success: true as const };
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return { success: false as const, error: error?.message || 'Erro ao remover tarefa' };
  }
};
