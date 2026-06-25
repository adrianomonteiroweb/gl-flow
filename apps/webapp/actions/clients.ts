'use server';

import { z } from 'zod';

import { ClientRepository, PipelineRepository, StepRepository, StatusRepository, NegotiationRepository } from '@workspace/db';
import { onlyNumbers, isCpf } from '@workspace/utils/text';
import { GetLeadParams, LeadRepository } from '@/repositories/LeadRepository';
import { isLeadScopeRestricted, canAccessSettings, canAssignLeads } from '@/lib/auth/permissions';
import { LeadActivityLogger } from '@/lib/activities/lead-activity-logger';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { getStepLabel, getStatusLabel } from '@/utils/status-utils';
import { fetchCompanyByCnpj, type BrasilApiCompany } from '@/lib/brasilapi';
import { MARITAL_STATUS_VALUES } from '@/lib/clients/marital-status';

import { getMe } from './users';

const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;
const MaritalStatusEnum = z.enum(MARITAL_STATUS_VALUES);

const AddressSchema = z.object({
  zipCode: z.string().min(8, 'CEP é obrigatório'),
  street: z.string().min(1, 'Endereço é obrigatório'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().min(1, 'Complemento é obrigatório'),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'Estado deve ter 2 letras'),
});

const PartnerSchema = z.object({
  document: z.string().refine(value => isCpf(onlyNumbers(value)), 'CPF do sócio inválido'),
  name: z.string().min(1, 'Nome do sócio é obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento do sócio é obrigatória'),
  phone: z.string().regex(PHONE_REGEX, 'Telefone do sócio inválido'),
  email: z.string().email('E-mail do sócio inválido'),
  marital_status: MaritalStatusEnum,
  has_cnh: z.boolean(),
  address: AddressSchema,
});

const BaseClientFields = {
  id: z.string().uuid().optional(),
  document: z.string().min(11, 'Documento é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().regex(PHONE_REGEX, 'Telefone inválido').optional().or(z.literal('')),
  phone_secondary: z.string().regex(PHONE_REGEX, 'WhatsApp inválido').optional().or(z.literal('')),
  address: AddressSchema,
  payload: z.any().optional(),
  client_created_at: z.string().optional(),
};

const CreateClientSchema = z
  .discriminatedUnion('person_type', [
    z.object({
      person_type: z.literal('pf'),
      ...BaseClientFields,
      birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
      marital_status: MaritalStatusEnum,
    }),
    z.object({
      person_type: z.literal('pj'),
      ...BaseClientFields,
      trade_name: z.string().optional().or(z.literal('')),
      founding_date: z.string().min(1, 'Data de abertura é obrigatória'),
      partners: z.array(PartnerSchema).min(1, 'Informe ao menos um sócio'),
    }),
  ])
  .superRefine((data, ctx) => {
    if (data.person_type !== 'pf') {
      return;
    }

    const hasPhone = !!data.phone && onlyNumbers(data.phone).length >= 10;
    const hasWhatsApp = !!data.phone_secondary && onlyNumbers(data.phone_secondary).length >= 10;

    if (!hasPhone && !hasWhatsApp) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone_secondary'], message: 'Informe WhatsApp ou telefone' });
    }
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
  founding_date: z.string().optional().or(z.literal('')),
  marital_status: z.string().optional().or(z.literal('')),
  partners: z.array(PartnerSchema).optional(),
  address: AddressSchema.partial().optional(),
  payload: z.any().optional(),
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

    if (!existingClient && !company) {
      console.warn(`CNPJ não encontrado: ${digits}`);
    }

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

/**
 * Lookup de pessoa física por CPF. A API externa de dados por CPF ainda não foi
 * implementada, então hoje só consulta a base local (igual ao lookupClientByDocument).
 * Quando a API existir, espelhar o fluxo de lookupCompanyByCnpj: retornar também
 * `person` (campos obrigatórios) e `enrichment` (não obrigatórios → payload.cpf).
 */
export const lookupPersonByCpf = async (cpf: string) => {
  try {
    const me = await getMe();

    if (!me) {
      return { status: 401, message: 'Usuário não autenticado' };
    }

    const workspaceId = await resolveWorkspaceId(me);

    if (!workspaceId) {
      return { status: 400, message: 'Workspace não encontrado.' };
    }

    const digits = onlyNumbers(cpf);

    if (digits.length !== 11) {
      return { status: 400, message: 'CPF deve ter 11 dígitos.' };
    }

    const existingClient = await ClientRepository.findByDocument(workspaceId, digits);

    return {
      status: 200,
      existingClient: existingClient ?? undefined,
      person: undefined,
    };
  } catch (error: unknown) {
    console.error('Erro ao buscar pessoa por CPF:', error);
    return { status: 500, message: 'Erro ao buscar dados da pessoa.' };
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

const createInitialNegotiation = async (
  workspaceId: string,
  clientId: string,
  clientName: string,
  branchId: string | null | undefined,
  assigneeId: string | null | undefined
) => {
  const pipeline = await PipelineRepository.findAll().then(pipelines =>
    pipelines.find(p => p.workspace_id === workspaceId && p.is_default && !p.deleted_at)
  );

  if (!pipeline) return;

  const step = await StepRepository.findAll().then(steps =>
    steps.find(
      s => s.workspace_id === workspaceId && s.slug === 'prospeccao' && !s.deleted_at
    )
  );

  if (!step) return;

  const status = await StatusRepository.findAll().then(statuses =>
    statuses.find(
      s => s.workspace_id === workspaceId && s.slug === 'novo' && !s.deleted_at
    )
  );

  if (!status) return;

  await NegotiationRepository.create({
    workspace_id: workspaceId,
    client_id: clientId,
    branch_id: branchId ?? null,
    title: clientName,
    pipeline_id: pipeline.id,
    step_id: step.id,
    status_id: status.id,
    assignee_id: assigneeId ?? null,
    sort_order: 0,
  });
};

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

    const input = parsed.data;
    const cleanDocument = onlyNumbers(input.document);

    const clientData: Record<string, unknown> = {
      workspace_id: workspaceId,
      assignee_id: me.id,
      person_type: input.person_type,
      name: input.name,
      email: input.email,
      address: input.address,
    };

    if (input.id) {
      clientData.id = input.id;
    }

    if (cleanDocument) {
      clientData.document = cleanDocument;
    }

    // Empty phone stays NULL so the partial unique index does not collide across
    // clients that only provide WhatsApp.
    if (input.phone) {
      clientData.phone = input.phone;
    }

    if (input.phone_secondary) {
      clientData.phone_secondary = input.phone_secondary;
    }

    if (input.payload) {
      clientData.payload = input.payload;
    }

    if (input.client_created_at) {
      clientData.client_created_at = input.client_created_at;
    }

    if (input.person_type === 'pf') {
      clientData.birth_date = input.birth_date;
      clientData.marital_status = input.marital_status;
    }

    if (input.person_type === 'pj') {
      if (input.trade_name) {
        clientData.trade_name = input.trade_name;
      }

      clientData.founding_date = input.founding_date;
      clientData.partners = input.partners.map(partner => ({ ...partner, document: onlyNumbers(partner.document) }));
    }

    const created = await ClientRepository.createIdempotent(clientData);

    LeadActivityLogger.log({
      workspace_id: workspaceId,
      lead_id: created.id,
      type: 'lead_created',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { origin: 'manual', person_type: input.person_type, entity: 'client' },
    });

    await createInitialNegotiation(workspaceId, created.id, created.name, created.branch_id, created.assignee_id);

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

    if (rest.founding_date !== undefined) {
      updateData.founding_date = rest.founding_date || null;
    }

    if (rest.marital_status !== undefined) {
      updateData.marital_status = rest.marital_status || null;
    }

    if (rest.partners !== undefined) {
      updateData.partners = rest.partners.map(partner => ({ ...partner, document: onlyNumbers(partner.document) }));
    }

    if (rest.payload !== undefined) {
      updateData.payload = rest.payload;
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
