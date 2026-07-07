'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { LeadRepository } from '@/repositories/LeadRepository';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';

import { getMe } from './users';
import { updateLeadStepBySlug } from './leads';

type LeadGuard = { ok: true; me: Record<string, any>; workspaceId: string; lead: Record<string, any> } | { ok: false; message: string };

const requireLead = async (leadId: string): Promise<LeadGuard> => {
  const me = await getMe();

  if (!me) {
    return { ok: false, message: 'Usuário não autenticado' };
  }

  const workspaceId = await resolveWorkspaceId(me);

  if (!workspaceId) {
    return { ok: false, message: 'Workspace não encontrado.' };
  }

  const lead = await LeadRepository.findById(leadId);

  if (!lead || lead.workspace_id !== workspaceId) {
    return { ok: false, message: 'Negociação não encontrada.' };
  }

  return { ok: true, me, workspaceId, lead };
};

const getPayload = (lead: Record<string, any>): Record<string, unknown> => (lead.payload as Record<string, unknown>) ?? {};

const PaymentInputSchema = z.object({
  lead_id: z.string().min(1),
  method: z.enum(['pix', 'card', 'transfer']),
  amount: z.number().positive('Valor inválido'),
  installments: z.number().int().positive().optional(),
  // Only the brand and last four digits are ever persisted — never the PAN/CVV.
  card_brand: z.string().max(20).optional(),
  card_last4: z.string().regex(/^\d{4}$/).optional(),
  status: z.enum(['pending', 'paid']),
  target_amount: z.number().positive(),
});

export async function registerNegotiationPayment(data: unknown) {
  try {
    const parsed = PaymentInputSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const guard = await requireLead(parsed.data.lead_id);

    if (!guard.ok) {
      return { success: false, message: guard.message };
    }

    const payload = getPayload(guard.lead);
    const payments = Array.isArray(payload.payments) ? (payload.payments as Record<string, unknown>[]) : [];

    const entry = {
      id: crypto.randomUUID(),
      method: parsed.data.method,
      amount: parsed.data.amount,
      installments: parsed.data.installments ?? 1,
      card_brand: parsed.data.card_brand ?? null,
      card_last4: parsed.data.card_last4 ?? null,
      status: parsed.data.status,
      at: new Date().toISOString(),
    };

    const next_payments = [...payments, entry];
    const paid_total = next_payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const settled = paid_total >= parsed.data.target_amount;

    await LeadRepository.update(parsed.data.lead_id, { payload: { ...payload, payments: next_payments } });

    // TODO: integrar com gateway real de pagamento (PIX/cartão) ao acionar "Cobrar".
    await updateLeadStepBySlug(parsed.data.lead_id, 'pagamento', settled ? 'pago' : 'aguardando_pagamento');

    revalidatePath('/pipelines', 'layout');

    return { success: true, data: { payments: next_payments, paid_total, settled } };
  } catch (error: unknown) {
    console.error('Erro ao registrar pagamento:', error);
    return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

const ConsorcioPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  credit: z.number(),
  installment: z.number(),
  term: z.number(),
  status: z.enum(['pre_approved', 'simulating']).optional(),
});

const ConsorcioInputSchema = z.object({
  lead_id: z.string().min(1),
  selected_plan: ConsorcioPlanSchema,
  plans: z.array(ConsorcioPlanSchema).optional(),
});

export async function saveConsorcioSelection(data: unknown) {
  try {
    const parsed = ConsorcioInputSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const guard = await requireLead(parsed.data.lead_id);

    if (!guard.ok) {
      return { success: false, message: guard.message };
    }

    const payload = getPayload(guard.lead);

    const consorcio = {
      selected_plan: parsed.data.selected_plan,
      plans: parsed.data.plans ?? [parsed.data.selected_plan],
      at: new Date().toISOString(),
    };

    await LeadRepository.update(parsed.data.lead_id, { payload: { ...payload, consorcio } });

    // TODO: integrar com IHS (Honda) para envio real da adesão ao consórcio.
    await updateLeadStepBySlug(parsed.data.lead_id, 'pagamento', 'financiamento');

    revalidatePath('/pipelines', 'layout');

    return { success: true, data: consorcio };
  } catch (error: unknown) {
    console.error('Erro ao salvar consórcio:', error);
    return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

const ApprovalInputSchema = z.object({ lead_id: z.string().min(1) });

const writeApproval = async (leadId: string, approved: boolean) => {
  const guard = await requireLead(leadId);

  if (!guard.ok) {
    return { success: false as const, message: guard.message };
  }

  const payload = getPayload(guard.lead);
  const now = new Date().toISOString();

  const approval = {
    status: approved ? 'approved' : 'pending',
    sent_at: now,
    approved_at: approved ? now : null,
  };

  await LeadRepository.update(leadId, { payload: { ...payload, approval } });

  // TODO: integrar com Holmes para o fluxo real de aprovação.
  await updateLeadStepBySlug(leadId, 'aprovacao', approved ? 'aprovado' : 'pendente');

  revalidatePath('/pipelines', 'layout');

  return { success: true as const, data: approval };
};

export async function sendNegotiationToApproval(data: unknown) {
  try {
    const parsed = ApprovalInputSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    return await writeApproval(parsed.data.lead_id, false);
  } catch (error: unknown) {
    console.error('Erro ao enviar para aprovação:', error);
    return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}

export async function simulateApproval(data: unknown) {
  try {
    const parsed = ApprovalInputSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    return await writeApproval(parsed.data.lead_id, true);
  } catch (error: unknown) {
    console.error('Erro ao simular aprovação:', error);
    return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}
