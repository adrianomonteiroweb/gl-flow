import { db, chats_table } from '@workspace/db';
import { eq, sql } from 'drizzle-orm';
import type { ConversationState } from './types';
import { AutomationLogger } from './audit-logger';

export const transitionState = async (params: {
  chatId: string;
  fromState: string | null | undefined;
  toState: ConversationState;
  workspaceId?: string | null;
  leadId?: string;
  channel?: string;
  payloadUpdates?: Record<string, unknown>;
}): Promise<void> => {
  const { chatId, fromState, toState, workspaceId, leadId, channel, payloadUpdates } = params;

  const mergeData = {
    conv_state_entered_at: new Date().toISOString(),
    ...payloadUpdates,
  };

  await db
    .update(chats_table)
    .set({
      conv_state: toState,
      payload: sql`COALESCE(payload, '{}') || ${JSON.stringify(mergeData)}::jsonb`,
      updated_at: new Date().toISOString(),
    })
    .where(eq(chats_table.id, chatId));

  AutomationLogger.log({
    workspace_id: workspaceId ?? undefined,
    chat_id: chatId,
    lead_id: leadId,
    event_type: 'STATE_TRANSITION',
    from_state: fromState ?? undefined,
    to_state: toState,
    channel,
  });
};
