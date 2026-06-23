'use server';

import { revalidatePath } from 'next/cache';

import { StepRepository, StatusRepository } from '@workspace/db';
import { GetChatParams, ChatRepository } from '@/repositories/ChatRepository';
import { LeadRepository } from '@/repositories/LeadRepository';
import { sendClosedWonMessage } from '@/utils/closed-won-message';
import { LeadActivityLogger } from '@/lib/activities/lead-activity-logger';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';

import { getMe } from './users';

const isClosedLost = (stepSlug?: string | null, statusSlug?: string | null): boolean =>
  stepSlug === 'closed' && statusSlug === 'negociacao_perdida';

const stepRowOf = async (stepId?: string | null) => (stepId ? await StepRepository.findById(stepId) : null);
const statusRowOf = async (statusId?: string | null) => (statusId ? await StatusRepository.findById(statusId) : null);

type CurrentChat = {
  lead_id?: string | null;
  workspace_id?: string | null;
  step?: string | null;
  status?: string | null;
};

type ActorInfo = {
  id: string;
  name?: string | null;
  workspace_id?: string | null;
};

const clearLeadLossReasonOnLeave = async (
  current: CurrentChat,
  newStep: string | null | undefined,
  newStatus: string | null | undefined,
  me: ActorInfo,
  chatId: number | string
): Promise<void> => {
  if (!current.lead_id) {
    return;
  }

  const [curStep, curStatus, nextStep, nextStatus] = await Promise.all([
    stepRowOf(current.step),
    statusRowOf(current.status),
    stepRowOf(newStep),
    statusRowOf(newStatus),
  ]);

  if (!isClosedLost(curStep?.slug, curStatus?.slug)) {
    return;
  }

  if (isClosedLost(nextStep?.slug, nextStatus?.slug)) {
    return;
  }

  const lead = await LeadRepository.findById(current.lead_id);

  if (!lead?.loss_reason) {
    return;
  }

  const previous_loss_reason = lead.loss_reason;
  await LeadRepository.update(current.lead_id, { loss_reason: null });

  LeadActivityLogger.log({
    workspace_id: current.workspace_id ?? me.workspace_id ?? null,
    lead_id: current.lead_id,
    chat_id: String(chatId),
    type: 'loss_reason_cleared',
    actor_type: 'user',
    actor_id: me.id,
    actor_name: me.name,
    metadata: { lossReason: previous_loss_reason },
  });
};

export async function getChat(id: number | string) {
  return await ChatRepository.findById(id);
}

export async function getChats(params: Omit<GetChatParams, 'workspace_id'>) {
  const me = await getMe();
  const workspace_id = await resolveWorkspaceId(me);

  if (!workspace_id) {
    return { count: 0, data: [] };
  }

  return await ChatRepository.getChats({ ...params, workspace_id });
}

export async function getChatWithLeadById(id: number | string) {
  return await ChatRepository.getChatWithLeadById(String(id));
}

export async function getChatsWithLeads(params: Omit<GetChatParams, 'workspace_id'>) {
  const me = await getMe();
  const workspace_id = await resolveWorkspaceId(me);

  if (!workspace_id) {
    return { count: 0, data: [] };
  }

  return await ChatRepository.getChatsWithLeads({ ...params, workspace_id });
}

export async function updateChatStatus(id: number | string, status: string, stepId?: string) {
  try {
    const me = await getMe();
    if (!me) return { success: false, error: 'Usuário não autenticado' };

    if (!id || !status?.trim()) {
      return { success: false, error: 'ID do chat ou status inválido' };
    }

    const current = await ChatRepository.findById(id);

    if (current) {
      const effectiveStep = stepId ?? current.step;
      await clearLeadLossReasonOnLeave(current, effectiveStep, status, me, id);
    }

    const updated = await ChatRepository.updateStatus(id, status, stepId);

    const [currentStatusRow, newStatusRow] = await Promise.all([statusRowOf(current?.status), statusRowOf(status)]);
    const won = newStatusRow?.slug === 'negociacao_ganha';
    const wasWon = currentStatusRow?.slug === 'negociacao_ganha';

    if (updated && current?.lead_id && current.status !== status) {
      LeadActivityLogger.log({
        workspace_id: current.workspace_id ?? me.workspace_id ?? null,
        lead_id: current.lead_id,
        chat_id: String(id),
        type: won ? 'chat_won' : 'status_changed',
        actor_type: 'user',
        actor_id: me.id,
        actor_name: me.name,
        metadata: { from: current.status, to: status, from_label: currentStatusRow?.name ?? null, to_label: newStatusRow?.name ?? null },
      });
    }

    if (updated && won && !wasWon) {
      const chat_with_lead = await ChatRepository.getChatWithLeadById(String(id));
      const lead = chat_with_lead?.lead;
      const chat = chat_with_lead?.chat;

      if (lead) {
        const origin = lead.metadata?.telegram_chat_id ? ('telegram' as const) : lead.phone ? ('whatsapp' as const) : null;

        if (origin) {
          await sendClosedWonMessage({
            chatId: String(id),
            workspaceId: chat?.workspace_id ?? null,
            origin,
            phone: lead.phone ?? undefined,
            telegramChatId: lead.metadata?.telegram_chat_id ?? undefined,
          });
        }
      }
    }

    return {
      success: !!updated,
      data: updated || null,
      error: updated ? undefined : 'Chat não encontrado',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Erro ao atualizar status',
    };
  }
}

export async function updateChatAssignee(id: number | string, assignee_id: number | string | null) {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    if (!id) {
      return { success: false, error: 'ID do chat inválido' };
    }

    const current = await ChatRepository.findById(id);
    const updated = await ChatRepository.updateAssignee(id, assignee_id);

    if (updated && current?.lead_id && current.assignee_id !== assignee_id) {
      LeadActivityLogger.log({
        workspace_id: current.workspace_id ?? me.workspace_id ?? null,
        lead_id: current.lead_id,
        chat_id: String(id),
        type: 'assignee_changed',
        actor_type: 'user',
        actor_id: me.id,
        actor_name: me.name,
        metadata: { from: current.assignee_id, to: assignee_id },
      });
    }

    return {
      success: !!updated,
      data: updated || null,
      error: updated ? undefined : 'Chat não encontrado',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Erro ao atualizar responsável',
    };
  }
}
export async function updateChatStep(id: number | string, step: string, status?: string) {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    if (!id || !step?.trim()) {
      return { success: false, error: 'ID do chat ou etapa inválido' };
    }

    const current = await ChatRepository.findById(id);

    if (current) {
      const effectiveStatus = status ?? current.status;
      await clearLeadLossReasonOnLeave(current, step, effectiveStatus, me, id);
    }

    const updated = await ChatRepository.updateStep(id, step, status);

    if (updated && current?.lead_id && current.step !== step) {
      const [fromStepRow, toStepRow] = await Promise.all([stepRowOf(current.step), stepRowOf(step)]);
      LeadActivityLogger.log({
        workspace_id: current.workspace_id ?? me.workspace_id ?? null,
        lead_id: current.lead_id,
        chat_id: String(id),
        type: 'step_changed',
        actor_type: 'user',
        actor_id: me.id,
        actor_name: me.name,
        metadata: { from: current.step, to: step, status, from_label: fromStepRow?.name ?? null, to_label: toStepRow?.name ?? null },
      });
    }

    revalidatePath('/chats', 'layout');

    return {
      success: !!updated,
      data: updated || null,
      error: updated ? undefined : 'Chat não encontrado',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Erro ao atualizar etapa',
    };
  }
}

export async function updateChatStepBySlug(id: number | string, stepSlug: string, statusSlug?: string) {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    if (!id || !stepSlug?.trim()) {
      return { success: false, error: 'Dados inválidos' };
    }

    const current = await ChatRepository.findById(id);
    const workspaceId = current?.workspace_id ?? (await resolveWorkspaceId(me));

    const updated = await ChatRepository.updateStepBySlug(id, workspaceId, stepSlug, statusSlug);

    if (updated && current?.lead_id) {
      await clearLeadLossReasonOnLeave(current, updated.step, updated.status, me, id);

      if (current.step !== updated.step) {
        const [fromStepRow, toStepRow] = await Promise.all([stepRowOf(current.step), stepRowOf(updated.step)]);
        LeadActivityLogger.log({
          workspace_id: current.workspace_id ?? me.workspace_id ?? null,
          lead_id: current.lead_id,
          chat_id: String(id),
          type: 'step_changed',
          actor_type: 'user',
          actor_id: me.id,
          actor_name: me.name,
          metadata: { from: current.step, to: updated.step, from_label: fromStepRow?.name ?? null, to_label: toStepRow?.name ?? null },
        });
      }
    }

    revalidatePath('/chats', 'layout');

    return {
      success: !!updated,
      data: updated || null,
      error: updated ? undefined : 'Não foi possível atualizar a etapa',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Erro ao atualizar etapa',
    };
  }
}

export async function closeChat(id: number | string) {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    if (!id) {
      return { success: false, error: 'ID do chat inválido' };
    }

    const current = await ChatRepository.findById(id);
    const updated = await ChatRepository.closeChat(id);

    if (updated && current?.lead_id && !current.done_at) {
      LeadActivityLogger.log({
        workspace_id: current.workspace_id ?? me.workspace_id ?? null,
        lead_id: current.lead_id,
        chat_id: String(id),
        type: 'chat_closed',
        actor_type: 'user',
        actor_id: me.id,
        actor_name: me.name,
      });
    }

    return {
      success: !!updated,
      data: updated || null,
      error: updated ? undefined : 'Chat não encontrado',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Erro ao encerrar chat',
    };
  }
}
