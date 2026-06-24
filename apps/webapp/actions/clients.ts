'use server';

import { z } from 'zod';

import { ClientRepository, PipelineRepository, StepRepository, StatusRepository } from '@workspace/db';
import { onlyNumbers } from '@workspace/utils/text';
import { GetLeadParams, LeadRepository } from '@/repositories/LeadRepository';
import { isLeadScopeRestricted, canAccessSettings, canAssignLeads } from '@/lib/auth/permissions';
import { LeadActivityLogger } from '@/lib/activities/lead-activity-logger';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { getStepLabel, getStatusLabel } from '@/utils/status-utils';
import { fetchCompanyByCnpj, type BrasilApiCompany } from '@/lib/brasilapi';

import { getMe } from './users';

const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

const AddressSchema = z.object({
  zipCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2, 'Estado deve ter 2 letras').optional(),
});

const CreateClientSchema = z
  .object({
    id: z.string().uuid().optional(),
    person_type: z.enum(['pf', 'pj']).default('pf'),
    name: z.string().min(1, 'Nome é obrigatório'),
    trade_name: z.string().optional().or(z.literal('')),
    document: z.string().optional().or(z.literal('')),
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    phone: z.string().regex(PHONE_REGEX, 'Telefone inválido').optional().or(z.literal('')),
    phone_secondary: z.string().regex(PHONE_REGEX, 'WhatsApp inválido').optional().or(z.literal('')),
    birth_date: z.string().optional().or(z.literal('')),
    address: AddressSchema.optional(),
    client_created_at: z.string().optional(),
  })
  .refine(d => !!(d.phone || d.phone_secondary), {
    message: 'Informe ao menos um telefone ou WhatsApp.',
    path: ['phone'],
  });

const UpdateClientSchema = z.object({
  person_type: z.enum(['pf', 'pj']).optional(),
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  trade_name: z.string().optional().or(z.literal('')),
  document: z.string().optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().regex(PHONE_REGEX, 'Telefone inválido').optional().or(z.literal('')),
  phone_secondary: z.string().regex(PHONE_REGEX, 'WhatsApp inválido').optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  address: AddressSchema.optional(),
});

// ─── Document / Company lookups ──────────────────────────────────────────────

export const lookupClientByDocument = async (document: string) => {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const workspaceId = await resolveWorkspaceId(me);

    if (!workspaceId) {
      return { status: 400, message: 'Workspace não encontrado.' };
    }

    const digits = onlyNumbers(document);

    if (digits.length !== 11 && digits.length !== 14) {
      return { status: 400, message: 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos.' };
    }

    const existing = await ClientRepository.findByDocument(workspaceId, digits);

    if (existing) {
      return { status: 200, data: existing };
    }

    return { status: 404 };
  } catch (error: unknown) {
    console.error('Erro ao buscar cliente por documento:', error);
    return { status: 500, message: 'Erro ao buscar cliente.' };
  }
};

export const lookupCompanyByCnpj = async (cnpj: string) => {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const workspaceId = await resolveWorkspaceId(me);

    if (!workspaceId) {
      return { status: 400, message: 'Workspace não encontrado.' };
    }

    const digits = onlyNumbers(cnpj);

    if (digits.length !== 14) {
      return { status: 400, message: 'CNPJ deve ter 14 dígitos.' };
    }

    const [existingClient, company] = await Promise.all([
      ClientRepository.findByDocument(workspaceId, digits),
      fetchCompanyByCnpj(digits),
    ]);

    return {
      status: 200,
      existingClient: existingClient ?? undefined,
      company: company ?? undefined,
    };
  } catch (error: unknown) {
    console.error('Erro ao buscar empresa por CNPJ:', error);
    return { status: 500, message: 'Erro ao buscar dados da empresa.' };
  }
};

type GetClientParams = {
  q?: string;
  page?: number;
  page_size?: number;
  includeInactive?: boolean;
  assigneeId?: string;
  unassignedOnly?: boolean;
};

export const getClients = async (params: GetClientParams) => {
  const me = await getMe();
  const workspace_id = await resolveWorkspaceId(me);

  if (!workspace_id) {
    return { count: 0, data: [] };
  }

  const includeInactive = params.includeInactive && me && canAccessSettings(me.role) ? true : false;

  if (me && isLeadScopeRestricted(me.role)) {
    return await ClientRepository.getClients({
      workspace_id,
      q: params.q,
      page: params.page,
      page_size: params.page_size,
      includeInactive,
      mineOrUnassignedUserId: me.id,
    });
  }

  return await ClientRepository.getClients({
    workspace_id,
    q: params.q,
    page: params.page,
    page_size: params.page_size,
    includeInactive,
    assigneeId: params.assigneeId,
    unassignedOnly: params.unassignedOnly,
  });
};

type AssigneeActivity = {
  /** Activity type to log. Defaults to 'assignee_changed' ("Responsável alterado"). */
  type?: 'assignee_changed' | 'lead_taken';
  /** Extra metadata merged into the activity (always includes from/to). */
  metadata?: Record<string, unknown>;
};

const setLeadAssignee = async (me: any, leadId: string, assigneeId: string | null, activity: AssigneeActivity = {}): Promise<boolean> => {
  const lead = await LeadRepository.findById(leadId);

  if (!lead) {
    return false;
  }

  if (lead.assignee_id === assigneeId) {
    return true;
  }

  const updated = await LeadRepository.update(leadId, { assignee_id: assigneeId });

  if (updated) {
    LeadActivityLogger.log({
      workspace_id: lead.workspace_id ?? me.workspace_id ?? null,
      lead_id: leadId,
      type: activity.type ?? 'assignee_changed',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { from: lead.assignee_id ?? null, to: assigneeId, ...(activity.metadata ?? {}) },
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

    const lead = await LeadRepository.findById(leadId);

    if (lead?.assignee_id && lead.assignee_id !== me.id) {
      return { status: 409, message: 'Este lead já foi assumido por outra pessoa.' };
    }

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

    const lead = await LeadRepository.findById(leadId);

    if (lead?.assignee_id && lead.assignee_id !== me.id && !canAssignLeads(me.role)) {
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
  /** How many leads each user receives in this run. */
  perUser: Record<string, number>;
  /** Projected total open load per user after the distribution. */
  finalTotals: Record<string, number>;
  /** Total leads that will be distributed. */
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
  /** When true, redistribute every open lead (even ones already assigned). */
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
      return { status: 403, message: 'Você não tem permissão para distribuir leads.' };
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
      return { status: 400, message: 'Nenhum lead para distribuir.' };
    }

    const perUser: Record<string, number> = Object.fromEntries(userIds.map(id => [id, 0]));
    let distributed = 0;

    for (const { leadId, userId } of assignments) {
      const ok = await setLeadAssignee(me, leadId, userId);

      if (ok) {
        perUser[userId] = (perUser[userId] ?? 0) + 1;
        distributed += 1;
      }
    }

    return { status: 200, data: { total: distributed, perUser } };
  } catch (error: any) {
    console.error('Erro ao distribuir leads:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function createClient(data: unknown) {
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

    const { address, id, ...rest } = parsed.data;
    const hasAddress = address && Object.values(address).some(v => v);
    const cleanDocument = rest.document ? onlyNumbers(rest.document) : undefined;

    const clientData: Record<string, unknown> = {
      workspace_id: workspaceId,
      assignee_id: me.id,
      person_type: rest.person_type,
      name: rest.name,
    };

    if (id) {
      clientData.id = id;
    }

    if (rest.trade_name) {
      clientData.trade_name = rest.trade_name;
    }

    if (cleanDocument) {
      clientData.document = cleanDocument;
    }

    if (rest.email) {
      clientData.email = rest.email;
    }

    if (rest.phone) {
      clientData.phone = rest.phone;
    }

    if (rest.phone_secondary) {
      clientData.phone_secondary = rest.phone_secondary;
    }

    if (rest.birth_date) {
      clientData.birth_date = rest.birth_date;
    }

    if (hasAddress) {
      clientData.address = address;
    }

    if (rest.client_created_at) {
      clientData.client_created_at = rest.client_created_at;
    }

    const created = await ClientRepository.createIdempotent(clientData);

    LeadActivityLogger.log({
      workspace_id: workspaceId,
      lead_id: created.id,
      type: 'lead_created',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { origin: 'manual', person_type: rest.person_type, entity: 'client' },
    });

    return { status: 200, data: created };
  } catch (error: unknown) {
    console.error('Erro ao criar cliente:', error);
    const constraint = (error as any)?.constraint ?? (error as any)?.cause?.constraint;

    if (constraint === 'uq_client_workspace_document') {
      return { status: 400, message: 'Já existe um cliente com este CPF/CNPJ cadastrado.' };
    }

    if (constraint === 'uq_client_workspace_phone') {
      return { status: 400, message: 'Já existe um cliente com este telefone cadastrado.' };
    }

    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function updateClient(id: string, data: unknown) {
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
    const updateData: Record<string, unknown> = {};

    if (rest.person_type !== undefined) {
      updateData.person_type = rest.person_type;
    }

    if (rest.name !== undefined) {
      updateData.name = rest.name;
    }

    if (rest.trade_name !== undefined) {
      updateData.trade_name = rest.trade_name || null;
    }

    if (rest.document !== undefined) {
      updateData.document = rest.document ? onlyNumbers(rest.document) : null;
    }

    if (rest.email !== undefined) {
      updateData.email = rest.email || null;
    }

    if (rest.phone !== undefined) {
      updateData.phone = rest.phone || null;
    }

    if (rest.phone_secondary !== undefined) {
      updateData.phone_secondary = rest.phone_secondary || null;
    }

    if (rest.birth_date !== undefined) {
      updateData.birth_date = rest.birth_date || null;
    }

    if (address) {
      const hasAddress = Object.values(address).some(v => v);

      if (hasAddress) {
        updateData.address = address;
      }
    }

    const updated = await ClientRepository.update(id, updateData);

    return { status: 200, data: updated };
  } catch (error: unknown) {
    console.error('Erro ao atualizar cliente:', error);
    const constraint = (error as any)?.constraint ?? (error as any)?.cause?.constraint;

    if (constraint === 'uq_client_workspace_document') {
      return { status: 400, message: 'Já existe um cliente com este CPF/CNPJ cadastrado.' };
    }

    if (constraint === 'uq_client_workspace_phone') {
      return { status: 400, message: 'Já existe um cliente com este telefone cadastrado.' };
    }

    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

/** A lead is resolved once it has been won or lost. */
const isLeadResolved = (lead: any): boolean => !!(lead?.won_at || lead?.lost_at);

export async function getClientPipelineStatus(leadId: string) {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const ticket = await LeadRepository.getLeadById(leadId);

    if (!ticket) {
      return { status: 404, message: 'Cliente não encontrado' };
    }

    const { lead, chat } = ticket;
    const canInactivate = isLeadResolved(lead);

    const stepLabel = lead.won_at
      ? 'Ganho'
      : lead.lost_at
        ? 'Perdido'
        : (chat?.step_name ?? getStepLabel(chat?.step ?? ''));

    const statusLabel = chat?.status_name ?? getStatusLabel(chat?.status ?? '');

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

    const ticket = await LeadRepository.getLeadById(id);
    const lead = ticket?.lead;

    if (!isLeadResolved(lead)) {
      return {
        status: 400,
        message: 'O cliente só pode ser inativado quando sua negociação estiver encerrada (ganha ou perdida).',
      };
    }

    await LeadRepository.inactivateClient(id);

    LeadActivityLogger.log({
      workspace_id: lead.workspace_id ?? me.workspace_id ?? null,
      lead_id: id,
      type: 'lead_closed',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
    });

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

    LeadActivityLogger.log({
      workspace_id: me.workspace_id ?? null,
      lead_id: id,
      type: 'lead_reactivated',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
    });

    return { status: 200 };
  } catch (error: any) {
    console.error('Erro ao reativar cliente:', error);
    return { status: 500, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}
