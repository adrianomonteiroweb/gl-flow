'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { GetLeadParams, LeadRepository } from '@/repositories/LeadRepository';
import { AddressData } from '@/repositories/types';
import { LeadActivityLogger } from '@/lib/activities/lead-activity-logger';
import { isLeadScopeRestricted } from '@/lib/auth/permissions';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';

import { getMe } from './users';

const UpdateLeadInfoSchema = z.object({
  name: z.string().min(1, 'Nome inválido').optional(),
  email: z.string().email('E-mail inválido').optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-().]{7,20}$/, 'Telefone inválido')
    .optional(),
});

type UpdateLeadInfoParams = z.infer<typeof UpdateLeadInfoSchema>;

export async function getLead(id: number | string) {
  return await LeadRepository.findById(id);
}

export async function getLeads(params: Omit<GetLeadParams, 'workspace_id'>) {
  const me = await getMe();
  const workspace_id = await resolveWorkspaceId(me);

  if (!workspace_id) {
    return { count: 0, data: [] };
  }

  const assigneeId = me && isLeadScopeRestricted(me.role) ? me.id : undefined;

  return await LeadRepository.getLeads({ ...params, workspace_id, assigneeId });
}

export async function getLeadWithChats(id: number | string) {
  return await LeadRepository.getLeadWithChatsById(String(id));
}

export async function updateLeadInfo(id: string, data: UpdateLeadInfoParams) {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const parsed = UpdateLeadInfoSchema.safeParse(data);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';

      return { success: false, error: message };
    }

    const updateData: Record<string, string> = {};

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }

    if (parsed.data.email !== undefined) {
      updateData.email = parsed.data.email;
    }

    if (parsed.data.phone !== undefined) {
      updateData.phone = parsed.data.phone;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true, data: null };
    }

    const updated = await LeadRepository.update(id, updateData);

    LeadActivityLogger.log({
      workspace_id: updated?.workspace_id ?? me.workspace_id ?? null,
      lead_id: id,
      type: 'info_updated',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { fields: Object.keys(updateData), values: updateData },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating lead info:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao atualizar informações',
    };
  }
}

const UpdateLeadAddressSchema = z.object({
  zipCode: z.string().min(1, 'CEP inválido').optional(),
  street: z.string().min(1, 'Logradouro inválido').optional(),
  number: z.string().min(1, 'Número inválido').optional(),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Bairro inválido').optional(),
  city: z.string().min(1, 'Cidade inválida').optional(),
  state: z.string().length(2, 'Estado deve ter 2 letras').optional(),
});

export async function updateLeadLossReason(id: string, lossReason: string | null) {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const parsed = z.string().max(500, 'Motivo muito longo').nullable().safeParse(lossReason);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';

      return { success: false, error: message };
    }

    const updated = await LeadRepository.update(id, { loss_reason: parsed.data });

    LeadActivityLogger.log({
      workspace_id: updated?.workspace_id ?? me.workspace_id ?? null,
      lead_id: id,
      type: parsed.data ? 'loss_reason_set' : 'loss_reason_cleared',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { lossReason: parsed.data },
    });

    revalidatePath('/chats', 'layout');

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating lead loss reason:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao atualizar motivo de perda',
    };
  }
}

export async function updateLeadAddress(id: string, address: AddressData) {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const parsed = UpdateLeadAddressSchema.safeParse(address);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';

      return { success: false, error: message };
    }

    const updated = await LeadRepository.update(id, { address: parsed.data });

    LeadActivityLogger.log({
      workspace_id: updated?.workspace_id ?? me.workspace_id ?? null,
      lead_id: id,
      type: 'address_updated',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { address: parsed.data },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating lead address:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao atualizar endereço',
    };
  }
}
