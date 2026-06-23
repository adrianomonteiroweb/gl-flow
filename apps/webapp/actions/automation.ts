'use server';

import { db, chats_table } from '@workspace/db';
import { eq, sql } from 'drizzle-orm';
import { getMe } from './users';
import { AutomationLogger } from '@/lib/conversation/audit-logger';
import { FollowUpScheduler } from '@/lib/conversation/followup-scheduler';

export const pauseAutomation = async (chatId: string): Promise<void> => {
  const [me, rows] = await Promise.all([
    getMe(),
    db
      .select({
        id: chats_table.id,
        conv_state: chats_table.conv_state,
        workspace_id: chats_table.workspace_id,
        lead_id: chats_table.lead_id,
      })
      .from(chats_table)
      .where(eq(chats_table.id, chatId))
      .limit(1),
  ]);

  const chat = rows[0];
  if (!chat) return;

  const mergeData = {
    pre_handoff_state: chat.conv_state ?? null,
    bot_paused_by: me?.id ?? null,
    bot_paused_at: new Date().toISOString(),
  };

  await db
    .update(chats_table)
    .set({
      conv_state: 'BOT_PAUSED',
      payload: sql`COALESCE(payload, '{}') || ${JSON.stringify(mergeData)}::jsonb`,
      updated_at: new Date().toISOString(),
    })
    .where(eq(chats_table.id, chatId));

  // Cancel any pending follow-ups — human agent is now handling the conversation.
  FollowUpScheduler.cancelFollowUps({
    chatId,
    workspaceId: chat.workspace_id,
    leadId: chat.lead_id,
  });

  AutomationLogger.log({
    workspace_id: chat.workspace_id ?? undefined,
    chat_id: chatId,
    lead_id: chat.lead_id,
    event_type: 'HANDOFF_START',
    from_state: chat.conv_state ?? undefined,
    to_state: 'BOT_PAUSED',
    payload: { paused_by: me?.id ?? null },
  });
};

export const resumeAutomation = async (chatId: string): Promise<void> => {
  const rows = await db
    .select({
      id: chats_table.id,
      conv_state: chats_table.conv_state,
      workspace_id: chats_table.workspace_id,
      lead_id: chats_table.lead_id,
      payload: chats_table.payload,
    })
    .from(chats_table)
    .where(eq(chats_table.id, chatId))
    .limit(1);

  const chat = rows[0];
  if (!chat) return;

  const chatPayload = (chat.payload as Record<string, unknown> | null) ?? {};
  const preHandoffState = (chatPayload.pre_handoff_state as string | null) ?? chat.conv_state;

  const mergeData = {
    pre_handoff_state: null,
    bot_paused_by: null,
    bot_paused_at: null,
  };

  await db
    .update(chats_table)
    .set({
      conv_state: preHandoffState ?? chat.conv_state,
      payload: sql`COALESCE(payload, '{}') || ${JSON.stringify(mergeData)}::jsonb`,
      updated_at: new Date().toISOString(),
    })
    .where(eq(chats_table.id, chatId));

  AutomationLogger.log({
    workspace_id: chat.workspace_id ?? undefined,
    chat_id: chatId,
    lead_id: chat.lead_id,
    event_type: 'HANDOFF_END',
    from_state: 'BOT_PAUSED',
    to_state: preHandoffState ?? chat.conv_state ?? undefined,
  });
};
