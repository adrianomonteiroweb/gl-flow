import { eq, and, desc, sql } from 'drizzle-orm';

import { createWhatsAppClient } from '@workspace/utils/whatsapp';
import { sendTelegramMessage } from '@/utils/telegram';
import { MessageRepository } from '@/repositories/MessagesRepository';
import { db, messages_table } from '@workspace/db';

import type { MessageChannel, WaNumber } from './types';

const SYSTEM_SENDER = { id: 'system', type: 'user' as const, name: 'Atendimento Automático' };
const WINDOW_24H_MS = 24 * 60 * 60 * 1000;

export class ResponseSender {
  static async shouldUseTemplate(chatId: string): Promise<boolean> {
    const lastMsg = await db
      .select({ received_at: messages_table.received_at })
      .from(messages_table)
      .where(and(eq(messages_table.chat_id, chatId), eq(messages_table.origin, 'whatsapp'), sql`${messages_table.sender}->>'type' = 'lead'`))
      .orderBy(desc(messages_table.received_at))
      .limit(1)
      .then(r => r[0] ?? null);

    if (!lastMsg?.received_at) {
      return true;
    }

    return Date.now() - new Date(lastMsg.received_at).getTime() > WINDOW_24H_MS;
  }

  static async send(params: {
    channel: MessageChannel;
    to: string;
    chatId: string;
    text: string;
    waNumber?: WaNumber | null;
    telegramBotToken?: string | null;
    templateName?: string;
  }): Promise<void> {
    const { channel, to, chatId, text, templateName, telegramBotToken } = params;

    try {
      if (channel === 'whatsapp') {
        if (!params.waNumber) {
          console.error('[ResponseSender] Integração WhatsApp não configurada para o workspace — mensagem não enviada.');
          return;
        }

        const waClient = createWhatsAppClient({
          phoneNumberId: params.waNumber.phone_number_id,
          accessToken: params.waNumber.access_token,
        });

        const useTemplate = !!templateName && (await this.shouldUseTemplate(chatId));

        if (useTemplate && templateName) {
          await waClient.sendMessage(to, { type: 'template', name: templateName, language: 'pt_BR' });
        } else {
          await waClient.sendTextMessage(to, text);
        }
      } else {
        await sendTelegramMessage(to, text, telegramBotToken);
      }

      await MessageRepository.create({
        chat_id: chatId,
        sender: SYSTEM_SENDER,
        type: 'text',
        origin: channel,
        content: text,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[ResponseSender] Failed to send ${channel} message:`, error);
    }
  }
}
