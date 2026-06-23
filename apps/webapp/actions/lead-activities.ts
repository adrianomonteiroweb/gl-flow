'use server';

import { z } from 'zod';
import { LeadActivityRepository, type LeadActivityType, type LeadActorType } from '@workspace/db';
import { LeadRepository } from '@/repositories/LeadRepository';
import { getMe } from './users';

export type LeadActivity = {
  id: string;
  workspace_id: string | null;
  lead_id: string;
  chat_id: string | null;
  type: LeadActivityType;
  actor_type: LeadActorType;
  actor_id: string | null;
  actor_name: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const inferOrigin = (lead: any): string => {
  if (lead?.metadata?.telegram_chat_id) return 'telegram';
  if (lead?.phone) return 'whatsapp';
  return 'manual';
};

/**
 * Returns the lead activity timeline (most recent first). If no `lead_created`
 * event exists (lead created before this feature, or imported), a synthetic
 * creation event is derived from the lead's created_at so the timeline is never
 * empty for an existing lead.
 */
export const getLeadActivities = async (leadId: string) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };

    const activities = (await LeadActivityRepository.findByLeadId(leadId)) as LeadActivity[];

    const hasCreation = activities.some(a => a.type === 'lead_created');
    if (!hasCreation) {
      const lead = await LeadRepository.findById(leadId);
      if (lead) {
        activities.push({
          id: `synthetic-created-${leadId}`,
          workspace_id: lead.workspace_id ?? null,
          lead_id: leadId,
          chat_id: null,
          type: 'lead_created',
          actor_type: 'system',
          actor_id: null,
          actor_name: lead.name ?? null,
          description: null,
          metadata: { origin: inferOrigin(lead), synthetic: true },
          created_at: lead.created_at,
        });
      }
    }

    return { success: true as const, data: activities };
  } catch (error: any) {
    console.error('Error fetching lead activities:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar histórico' };
  }
};

const AddNoteSchema = z.object({
  leadId: z.string().min(1),
  text: z.string().trim().min(1, 'A nota não pode estar vazia').max(1000, 'Nota muito longa'),
});

export const addLeadNote = async (leadId: string, text: string) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };

    const parsed = AddNoteSchema.safeParse({ leadId, text });
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    const lead = await LeadRepository.findById(parsed.data.leadId);

    // Use create (not log) so a failed insert surfaces to the user — the note is
    // the primary action here, unlike the fire-and-forget activity logging.
    await LeadActivityRepository.create({
      workspace_id: lead?.workspace_id ?? me.workspace_id ?? null,
      lead_id: parsed.data.leadId,
      type: 'note_added',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      description: parsed.data.text,
    });

    return { success: true as const };
  } catch (error: any) {
    console.error('Error adding lead note:', error);
    return { success: false as const, error: error?.message || 'Erro ao adicionar nota' };
  }
};
