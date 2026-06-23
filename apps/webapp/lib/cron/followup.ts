import { and, eq, inArray, lte } from 'drizzle-orm';

import {
  db,
  chat_scheduled_messages_table,
  chats_table,
  leads_table,
  wa_numbers_table,
  FlowConfigRepository,
  decryptToken,
  type FlowConfigData,
} from '@workspace/db';
import { sendFollowUpMessage } from '@/utils/followup-message';
import { resolveTelegramBotToken } from '@/lib/telegram';

export type FollowupCronResult = { claimed: number; sent: number; failed: number };

export const runFollowupCron = async (): Promise<FollowupCronResult> => {
  const now = new Date().toISOString();

  const claimed = await db
    .update(chat_scheduled_messages_table)
    .set({ status: 'processing', updated_at: now })
    .where(and(eq(chat_scheduled_messages_table.status, 'pending'), lte(chat_scheduled_messages_table.scheduled_at, now)))
    .returning();

  if (claimed.length === 0) return { claimed: 0, sent: 0, failed: 0 };

  const claimedIds = claimed.map(c => c.id);
  const claimedWithLeads = await db
    .select({
      id: chat_scheduled_messages_table.id,
      chat_id: chat_scheduled_messages_table.chat_id,
      step_order: chat_scheduled_messages_table.step_order,
      origin: chat_scheduled_messages_table.origin,
      flow_name: chat_scheduled_messages_table.flow_name,
      trigger_state: chat_scheduled_messages_table.trigger_state,
      phone: leads_table.phone,
      lead_metadata: leads_table.metadata,
      workspace_id: chats_table.workspace_id,
      // WA number credentials for building a per-number API client
      wa_phone_number_id: wa_numbers_table.phone_number_id,
      wa_access_token: wa_numbers_table.access_token,
    })
    .from(chat_scheduled_messages_table)
    .innerJoin(chats_table, eq(chats_table.id, chat_scheduled_messages_table.chat_id))
    .innerJoin(leads_table, eq(leads_table.id, chats_table.lead_id))
    .leftJoin(wa_numbers_table, and(eq(wa_numbers_table.workspace_id, chats_table.workspace_id), eq(wa_numbers_table.is_active, true)))
    .where(inArray(chat_scheduled_messages_table.id, claimedIds));

  let sent = 0;
  let failed = 0;

  for (const row of claimedWithLeads) {
    try {
      const leadMeta = row.lead_metadata as Record<string, unknown> | null;

      let messageText: string | null = null;
      let templateName: string | null = null;

      if (row.workspace_id && row.flow_name) {
        const flowConfig = await FlowConfigRepository.findActiveByWorkspaceAndFlow(row.workspace_id, row.flow_name ?? 'onboarding');

        if (flowConfig?.config) {
          const config = flowConfig.config as FlowConfigData;
          const stepConfig = config.steps.find(s => s.order === row.step_order && s.trigger_state === row.trigger_state);

          if (stepConfig) {
            messageText = stepConfig.message ?? null;
            templateName = stepConfig.template_name ?? null;
          }
        }
      }

      const waNumber =
        row.wa_phone_number_id && row.wa_access_token
          ? ({
              phone_number_id: row.wa_phone_number_id,
              access_token: decryptToken(row.wa_access_token),
            } as Parameters<typeof sendFollowUpMessage>[0]['waNumber'])
          : null;

      const telegramBotToken = row.origin === 'telegram' ? await resolveTelegramBotToken(row.workspace_id) : null;

      await sendFollowUpMessage({
        chatId: row.chat_id,
        origin: row.origin as 'whatsapp' | 'telegram',
        phone: row.phone ?? undefined,
        telegramChatId: leadMeta?.telegram_chat_id ? Number(leadMeta.telegram_chat_id) : undefined,
        stepOrder: row.step_order,
        messageText,
        templateName,
        waNumber,
        telegramBotToken,
      });

      await db
        .update(chat_scheduled_messages_table)
        .set({ status: 'sent', updated_at: new Date().toISOString() })
        .where(eq(chat_scheduled_messages_table.id, row.id));

      sent++;
    } catch (err) {
      console.error(`[cron/followup] chat=${row.chat_id} step=${row.step_order}:`, err);

      await db
        .update(chat_scheduled_messages_table)
        .set({ status: 'failed', updated_at: new Date().toISOString() })
        .where(eq(chat_scheduled_messages_table.id, row.id));

      failed++;
    }
  }

  return { claimed: claimed.length, sent, failed };
};
