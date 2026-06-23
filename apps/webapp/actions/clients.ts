'use server';

import { z } from 'zod';

import { GetLeadParams, LeadRepository } from '@/repositories/LeadRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { isLeadScopeRestricted, canAccessSettings, canAssignLeads } from '@/lib/auth/permissions';
import { LeadActivityLogger } from '@/lib/activities/lead-activity-logger';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { getStepLabel, getStatusLabel } from '@/utils/status-utils';

import { getMe } from './users';

const CreateClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-().]{7,20}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  address: z
    .object({
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2, 'Estado deve ter 2 letras').optional(),
    })
    .optional(),
  loss_reason: z.string().max(500, 'Motivo de perda muito longo').optional().or(z.literal('')),
});

const UpdateClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-().]{7,20}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  address: z
    .object({
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2, 'Estado deve ter 2 letras').optional(),
    })
    .optional(),
});

export async function getClients(params: Omit<GetLeadParams, 'workspace_id'>) {
  const me = await getMe();
  const workspace_id = await resolveWorkspaceId(me);

  if (!workspace_id) {
    return { count: 0, data: [] };
  }

  const includeInactive = params.includeInactive && me && canAccessSettings(me.role) ? true : false;

  if (me && isLeadScopeRestricted(me.role)) {
    return await LeadRepository.getClients({
      workspace_id,
      q: params.q,
      page: params.page,
      page_size: params.page_size,
      includeInactive,
      mineOrUnassignedUserId: me.id,
    });
  }

  return await LeadRepository.getClients({
    workspace_id,
    q: params.q,
    page: params.page,
    page_size: params.page_size,
    includeInactive,
    assigneeId: params.assigneeId,
    unassignedOnly: params.unassignedOnly,
  });
}

type AssigneeActivity = {
  /** Activity type to log. Defaults to 'assignee_changed' ("Responsável alterado"). */
  type?: 'assignee_changed' | 'lead_taken';
  /** Extra metadata merged into the activity (always includes from/to). */
  metadata?: Record<string, unknown>;
};

const setLeadAssignee = async (me: any, leadId: string, assigneeId: string | null, activity: AssigneeActivity = {}): Promise<boolean> => {
  const chat = await ChatRepository.resolveActiveChat(leadId, me.workspace_id ?? null);

  if (!chat) {
    return false;
  }

  if (chat.assignee_id === assigneeId) {
    return true;
  }

  const updated = await ChatRepository.updateAssignee(chat.id, assigneeId);

  if (updated) {
    LeadActivityLogger.log({
      workspace_id: chat.workspace_id ?? me.workspace_id ?? null,
      lead_id: leadId,
      chat_id: String(chat.id),
      type: activity.type ?? 'assignee_changed',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { from: chat.assignee_id ?? null, to: assigneeId, ...(activity.metadata ?? {}) },
    });
  }

  return !!updated;
};

export async function assignClient(leadId: string, assigneeId: string | null) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    if (!canAssignLeads(me.role)) {
      return { status: 403, message: 'Você não tem permissão para atribuir responsáveis.' };
    }

    const ok = await setLeadAssignee(me, leadId, assigneeId);

    return ok ? { status: 200 } : { status: 500, message: 'Não foi possível atualizar o responsável.' };
  } catch (error: any) {
    console.error('Erro ao atribuir responsável:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function takeClient(leadId: string) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const chat = await ChatRepository.findActiveByLeadId(leadId);

    if (chat?.assignee_id && chat.assignee_id !== me.id) {
      return { status: 409, message: 'Este lead já foi assumido por outra pessoa.' };
    }

    // Self-assign is logged as "Assumido por usuário <papel>" rather than the

    const ok = await setLeadAssignee(me, leadId, me.id, { type: 'lead_taken', metadata: { role: me.role } });

    return ok ? { status: 200 } : { status: 500, message: 'Não foi possível assumir o lead.' };
  } catch (error: any) {
    console.error('Erro ao assumir lead:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function releaseClient(leadId: string) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const chat = await ChatRepository.findActiveByLeadId(leadId);

    if (chat?.assignee_id && chat.assignee_id !== me.id && !canAssignLeads(me.role)) {
      return { status: 403, message: 'Você só pode liberar leads atribuídos a você.' };
    }

    const ok = await setLeadAssignee(me, leadId, null);

    return ok ? { status: 200 } : { status: 500, message: 'Não foi possível liberar o lead.' };
  } catch (error: any) {
    console.error('Erro ao liberar lead:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

type DistributionPlan = {
  /** Ordered (FIFO) lead → user assignments to apply. */
  assignments: { leadId: string; userId: string }[];
  /** How many atendimentos each user receives in this run. */
  perUser: Record<string, number>;
  /** Projected total open load per user after the distribution. */
  finalTotals: Record<string, number>;
  /** Total atendimentos that will be distributed. */
  total: number;
};

const buildDistributionPlan = async (workspaceId: string, reassignAll: boolean, userIds: string[]): Promise<DistributionPlan> => {
  const pool = await LeadRepository.getDistributableLeads(workspaceId, reassignAll);
  const openLoad = await LeadRepository.countOpenAssignmentsByUser(workspaceId, userIds);

  const candidateSet = new Set(userIds);

  const finalTotals: Record<string, number> = Object.fromEntries(userIds.map(id => [id, openLoad[id] ?? 0]));

  for (const item of pool) {
    if (item.assigneeId && candidateSet.has(item.assigneeId)) {
      finalTotals[item.assigneeId] = Math.max(0, (finalTotals[item.assigneeId] ?? 0) - 1);
    }
  }

  const perUser: Record<string, number> = Object.fromEntries(userIds.map(id => [id, 0]));
  const assignments: { leadId: string; userId: string }[] = [];

  for (const item of pool) {
    // Least-loaded user; ties break by userIds order (stable).
    let target = userIds[0]!;
    for (const userId of userIds) {
      if ((finalTotals[userId] ?? 0) < (finalTotals[target] ?? 0)) {
        target = userId;
      }
    }
    finalTotals[target] = (finalTotals[target] ?? 0) + 1;
    perUser[target] = (perUser[target] ?? 0) + 1;
    assignments.push({ leadId: item.leadId, userId: target });
  }

  return { assignments, perUser, finalTotals, total: assignments.length };
};

type DistributeParams = {
  /** When true, redistribute every open atendimento (even ones being worked). */
  reassignAll?: boolean;
  /** Users to distribute among. */
  userIds: string[];
};

export async function previewDistribution(params: DistributeParams) {
  const me = await getMe();

  if (!me || !canAssignLeads(me.role)) {
    return { total: 0, perUser: {}, finalTotals: {} };
  }

  const workspaceId = await resolveWorkspaceId(me);

  if (!workspaceId) {
    return { total: 0, perUser: {}, finalTotals: {} };
  }

  const userIds = (params.userIds ?? []).filter(Boolean);

  if (userIds.length === 0) {
    return { total: 0, perUser: {}, finalTotals: {} };
  }

  const { total, perUser, finalTotals } = await buildDistributionPlan(workspaceId, !!params.reassignAll, userIds);

  return { total, perUser, finalTotals };
}

export async function distributeClients(params: DistributeParams) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    if (!canAssignLeads(me.role)) {
      return { status: 403, message: 'Você não tem permissão para distribuir atendimentos.' };
    }

    const workspaceId = await resolveWorkspaceId(me);

    if (!workspaceId) {
      return { status: 400, message: 'Workspace não encontrado.' };
    }

    const userIds = (params.userIds ?? []).filter(Boolean);

    if (userIds.length === 0) {
      return { status: 400, message: 'Selecione ao menos um usuário para distribuir.' };
    }

    const reassignAll = !!params.reassignAll;
    const { assignments } = await buildDistributionPlan(workspaceId, reassignAll, userIds);

    if (assignments.length === 0) {
      return { status: 400, message: 'Nenhum atendimento para distribuir.' };
    }

    const perUser: Record<string, number> = Object.fromEntries(userIds.map(id => [id, 0]));
    let distributed = 0;

    for (const { leadId, userId } of assignments) {
      if (!reassignAll) {
        const activeChat = await ChatRepository.findActiveByLeadId(leadId);
        if (activeChat?.assignee_id && (await LeadRepository.chatHasHumanInteraction(activeChat.id))) {
          continue;
        }
      }

      const ok = await setLeadAssignee(me, leadId, userId);

      if (ok) {
        perUser[userId] = (perUser[userId] ?? 0) + 1;
        distributed += 1;
      }
    }

    return { status: 200, data: { total: distributed, perUser } };
  } catch (error: any) {
    console.error('Erro ao distribuir atendimentos:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function createClient(data: any) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const workspaceId = await resolveWorkspaceId(me);

    if (!workspaceId) {
      return { status: 400, message: 'Não foi possível determinar o workspace do cliente' };
    }

    const parsed = CreateClientSchema.safeParse(data);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { status: 400, message };
    }

    const { address, ...rest } = parsed.data;

    const hasAddress = address && Object.values(address).some(v => v);

    const clientData: any = {
      name: rest.name,
      workspace_id: workspaceId,
    };

    if (rest.email) {
      clientData.email = rest.email;
    }

    if (rest.phone) {
      clientData.phone = rest.phone;
    }

    if (rest.loss_reason) {
      clientData.loss_reason = rest.loss_reason;
    }

    if (hasAddress) {
      clientData.address = address;
    }

    const created = await LeadRepository.create(clientData);

    let chat: any = null;

    try {
      chat = await ChatRepository.create({
        lead_id: created.id,
        workspace_id: workspaceId,
        assignee_id: me.id,
        title: `Cliente - ${created.name}`,
        step: 'new',
        status: 'pending',
      });
    } catch (error: any) {
      console.error('Erro ao criar chat para o cliente:', error);
      // Don't fail the client creation if chat creation fails
    }

    LeadActivityLogger.log({
      workspace_id: workspaceId,
      lead_id: created.id,
      chat_id: chat?.id ?? null,
      type: 'lead_created',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { origin: 'manual' },
    });

    return { status: 200, data: created };
  } catch (error: any) {
    console.error('Erro ao criar cliente:', error);
    const constraint = error.constraint ?? error.cause?.constraint;

    if (constraint === 'uq_lead_phone_workspace') {
      return { status: 400, message: 'Já existe um cliente com este telefone cadastrado.' };
    }

    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function updateClient(id: string, data: any) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const parsed = UpdateClientSchema.safeParse(data);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { status: 400, message };
    }

    const { address, ...rest } = parsed.data;

    const updateData: any = {};

    if (rest.name !== undefined) {
      updateData.name = rest.name;
    }

    if (rest.email !== undefined) {
      updateData.email = rest.email || null;
    }

    if (rest.phone !== undefined) {
      updateData.phone = rest.phone || null;
    }

    if (address) {
      const hasAddress = Object.values(address).some(v => v);

      if (hasAddress) {
        updateData.address = address;
      }
    }

    const updated = await LeadRepository.update(id, updateData);

    return { status: 200, data: updated };
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    const constraint = error.constraint ?? error.cause?.constraint;

    if (constraint === 'uq_lead_phone_workspace') {
      return { status: 400, message: 'Já existe um cliente com este telefone cadastrado.' };
    }

    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

const isPipelineResolved = (chat: any): boolean => {
  return chat?.step_slug === 'closed' && (chat?.status_slug === 'negociacao_ganha' || chat?.status_slug === 'negociacao_perdida');
};

export async function getClientPipelineStatus(leadId: string) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const ticket = await LeadRepository.getLeadWithChatsById(leadId);

    if (!ticket) {
      return { status: 404, message: 'Cliente não encontrado' };
    }

    const chat = ticket.chat;
    const canInactivate = isPipelineResolved(chat);

    const stepLabel =
      chat?.step_slug === 'closed'
        ? chat?.status_slug === 'negociacao_perdida'
          ? 'Fechado – Perdido'
          : 'Fechado – Ganho'
        : (chat?.step_name ?? getStepLabel(chat?.step ?? 'new'));

    const statusLabel = chat?.status_name ?? getStatusLabel(chat?.status ?? 'pending');

    return {
      status: 200,
      canInactivate,
      stepLabel,
      statusLabel,
    };
  } catch (error: any) {
    console.error('Erro ao verificar status do pipeline:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function inactivateClient(id: string) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const ticket = await LeadRepository.getLeadWithChatsById(id);
    const chat = ticket?.chat;

    if (!isPipelineResolved(chat)) {
      return {
        status: 400,
        message: 'O cliente só pode ser inativado quando sua negociação estiver encerrada (Fechado – Ganho ou Fechado – Perdido).',
      };
    }

    await LeadRepository.inactivateClient(id);

    const activeChat = await ChatRepository.findActiveByLeadId(id);

    if (activeChat) {
      await ChatRepository.closeChat(activeChat.id);

      LeadActivityLogger.log({
        workspace_id: activeChat.workspace_id ?? me.workspace_id ?? null,
        lead_id: id,
        chat_id: String(activeChat.id),
        type: 'chat_closed',
        actor_type: 'user',
        actor_id: me.id,
        actor_name: me.name,
      });
    }

    return { status: 200 };
  } catch (error: any) {
    console.error('Erro ao inativar cliente:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function reactivateClient(id: string) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    if (!canAccessSettings(me.role)) {
      return { status: 403, message: 'Você não tem permissão para reativar clientes.' };
    }

    await LeadRepository.reactivateClient(id);

    return { status: 200 };
  } catch (error: any) {
    console.error('Erro ao reativar cliente:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}
