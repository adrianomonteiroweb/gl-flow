import { eq, and, isNull, sql } from 'drizzle-orm';

import { db, leads_table, chats_table, workspaces_table, WaNumberRepository, PipelineRepository, StepRepository, StatusRepository } from '@workspace/db';
import { LeadRepository } from '@/repositories/LeadRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { LeadActivityLogger } from '@/lib/activities/lead-activity-logger';

import type { IncomingMessage, Lead, Chat, Workspace, WaNumber } from './types';

export type ResolverResult = {
  lead: Lead;
  chat: Chat;
  workspace: Workspace | null;
  waNumber: WaNumber | null;
  leadCreated: boolean;
  chatCreated: boolean;
};

type ResolveOptions = { phoneNumberId?: string; workspaceId?: string };

export class ChatResolver {
  static async resolve(msg: IncomingMessage, options?: string | ResolveOptions): Promise<ResolverResult> {
    const opts: ResolveOptions = typeof options === 'string' ? { phoneNumberId: options } : (options ?? {});

    let waNumber: WaNumber | null = null;
    let workspace: Workspace | null = null;

    if (msg.channel === 'whatsapp' && opts.phoneNumberId) {
      waNumber = ((await WaNumberRepository.findByPhoneNumberId(opts.phoneNumberId)) as WaNumber | undefined) ?? null;
      if (waNumber) {
        workspace = await db
          .select()
          .from(workspaces_table)
          .where(eq(workspaces_table.id, waNumber.workspace_id))
          .limit(1)
          .then(r => r[0] ?? null);
      }
    }

    if (!workspace && opts.workspaceId) {
      workspace = await db
        .select()
        .from(workspaces_table)
        .where(eq(workspaces_table.id, opts.workspaceId))
        .limit(1)
        .then(r => r[0] ?? null);
    }

    if (!workspace) {
      workspace = await db
        .select()
        .from(workspaces_table)
        .where(eq(workspaces_table.slug, 'default'))
        .limit(1)
        .then(r => r[0] ?? null);
    }

    const workspaceId = workspace?.id ?? null;

    let lead: Lead;
    let leadCreated: boolean;

    if (msg.channel === 'whatsapp') {
      const [found, created] = await LeadRepository.findOrCreate(eq(leads_table.phone, msg.from), {
        name: msg.profileName,
        phone: msg.from,
        workspace_id: workspaceId,
      });
      lead = found as Lead;
      leadCreated = created as boolean;
    } else {
      const existing = await db
        .select()
        .from(leads_table)
        .where(sql`${leads_table.metadata}->>'telegram_chat_id' = ${msg.from}`)
        .limit(1)
        .then(r => r[0] ?? null);

      if (existing) {
        lead = existing;
        leadCreated = false;
      } else {
        lead = await db
          .insert(leads_table)
          .values({
            name: msg.profileName,
            workspace_id: workspaceId,
            metadata: { telegram_chat_id: Number(msg.from) },
          })
          .returning()
          .then(r => r[0]!);
        leadCreated = true;
      }
    }

    if (!leadCreated && (lead as any).deleted_at) {
      const reactivated = await LeadRepository.reactivateClient(lead.id);

      if (reactivated) {
        lead = reactivated as Lead;
      }

      LeadActivityLogger.log({
        workspace_id: workspaceId,
        lead_id: lead.id,
        type: 'lead_reactivated',
        actor_type: 'system',
        actor_name: 'Sistema',
        metadata: { origin: msg.channel },
      });
    }

    if (leadCreated) {
      LeadActivityLogger.log({
        workspace_id: workspaceId,
        lead_id: lead.id,
        type: 'lead_created',
        actor_type: 'lead',
        actor_name: lead.name ?? msg.profileName,
        metadata: { origin: msg.channel },
      });
    }

    let chat = (await ChatRepository.findOne(and(eq(chats_table.lead_id, lead.id), isNull(chats_table.done_at)))) ?? null;

    let chatCreated = false;

    if (!chat) {
      const title = msg.channel === 'telegram' ? `Telegram - ${msg.profileName}` : 'Novo Lead';

      const newChat: Record<string, unknown> = {
        lead_id: lead.id,
        workspace_id: workspaceId,
        title,
        conv_state: 'AWAITING_NAME',
      };

      if (workspaceId) {
        const pipeline = await PipelineRepository.findDefaultByWorkspace(workspaceId);
        if (pipeline) {
          newChat.pipeline_id = pipeline.id;

          const step = (await StepRepository.findBySlug(workspaceId, 'new')) ?? (await StepRepository.findFirstByPipeline(workspaceId, pipeline.id));
          if (step) newChat.step = step.id;

          const status = await StatusRepository.findBySlug(workspaceId, 'pending');
          if (status) newChat.status = status.id;
        }
      }

      chat = await ChatRepository.create(newChat);
      chatCreated = true;
    }

    return { lead, chat: chat as Chat, workspace, waNumber, leadCreated, chatCreated };
  }
}
