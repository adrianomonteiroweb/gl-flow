'use server';

import { GetMessageParams, MessageRepository } from '@/repositories/MessagesRepository';
import { createWhatsAppClient } from '@workspace/utils/whatsapp';
import { FlowConfigRepository, WaNumberRepository } from '@workspace/db';
import { normalizePhoneBR } from '@workspace/utils/notifications';
import { sendTelegramMessage } from '@/utils/telegram';
import { resolveTelegramBotToken } from '@/lib/telegram';
import { ResponseSender } from '@/lib/conversation/sender';
import { FollowUpScheduler } from '@/lib/conversation/followup-scheduler';

import { getMe } from './users';
import { getChatWithLeadById, updateChatAssignee, getChat } from './chats';
import { pauseAutomation } from './automation';

const DEFAULT_INITIATION_TEMPLATE = 'followup_24h';

const resolveInitiationTemplate = async (workspaceId: string | null): Promise<string> => {
  if (!workspaceId) {
    return DEFAULT_INITIATION_TEMPLATE;
  }

  const flowConfig = await FlowConfigRepository.findActiveByWorkspaceAndFlow(workspaceId, 'onboarding');
  const steps = (flowConfig?.config as { steps?: Array<{ template_name?: string | null }> } | undefined)?.steps;

  return steps?.find(step => step.template_name)?.template_name ?? DEFAULT_INITIATION_TEMPLATE;
};

export async function getMessage(id: number | string) {
  return await MessageRepository.findById(id);
}

export async function getMessages(params: GetMessageParams) {
  return await MessageRepository.getMessages(params);
}

export async function getMessageWithChat(id: number | string) {
  return await MessageRepository.getMessageById(String(id));
}

export async function getMessagesWithChat(params: GetMessageParams) {
  return await MessageRepository.getMessagesWithChat(params);
}

export async function getMessagesByChatWithChat(chatId: number | string, params: GetMessageParams) {
  return await MessageRepository.getMessagesByChatWithChat(String(chatId), params);
}

export async function sendMessage(
  chatId: string,
  content: string,
  sender: { id: string; type: 'user' | 'lead'; name: string },
  type: 'text' | 'image' = 'text'
) {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    let chat = null;

    if (sender.type === 'user') {
      chat = await getChat(chatId);

      if (chat && !chat.assignee_id) {
        await updateChatAssignee(chatId, sender.id);
      }

      if (chat?.conv_state !== 'BOT_PAUSED') {
        await pauseAutomation(chatId);
      }
    }

    let origin = 'web';
    let waMessageId: string | undefined;

    const chat_with_lead = await getChatWithLeadById(chatId);
    const leadPhone = chat_with_lead?.lead?.phone;
    const workspaceId = chat_with_lead?.chat?.workspace_id ?? null;
    const telegramChatId = (chat_with_lead?.lead?.metadata as { telegram_chat_id?: number } | null)?.telegram_chat_id;

    if (leadPhone && sender.type === 'user') {
      origin = 'whatsapp';
      const normalizedPhone = normalizePhoneBR(leadPhone);

      const [waNumber] = workspaceId ? await WaNumberRepository.findActiveByWorkspace(workspaceId) : [];

      if (!waNumber) {
        return { success: false, error: 'Integração WhatsApp não configurada.' };
      }

      const wa_client = createWhatsAppClient({ phoneNumberId: waNumber.phone_number_id, accessToken: waNumber.access_token });

      const use_template = await ResponseSender.shouldUseTemplate(chatId);

      try {
        if (use_template) {
          const templateName = await resolveInitiationTemplate(workspaceId);
          const response = await wa_client.sendMessage(normalizedPhone, {
            type: 'template',
            name: templateName,
            language: 'pt_BR',
          });
          waMessageId = response.messageId;
        } else if (type === 'image') {
          const response = await wa_client.sendMessage(normalizedPhone, { type: 'image', url: content });
          waMessageId = response.messageId;
        } else {
          const response = await wa_client.sendMessage(normalizedPhone, { type: 'text', body: content.trim() });
          waMessageId = response.messageId;
        }
      } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        // Still save the message locally even if WhatsApp send fails.
      }
    } else if (telegramChatId && sender.type === 'user') {
      origin = 'telegram';

      const botToken = await resolveTelegramBotToken(workspaceId);

      if (!botToken) {
        return { success: false, error: 'Integração Telegram não configurada.' };
      }

      try {
        await sendTelegramMessage(telegramChatId, content.trim(), botToken);
      } catch (telegramError) {
        console.error('[sendMessage] Failed to send Telegram message:', telegramError);
        // Still save the message locally even if Telegram send fails.
      }
    }

    const newMessage = await MessageRepository.create({
      chat_id: chatId,
      sender: sender,
      type,
      origin,
      content: content.trim(),
      sent_at: new Date().toISOString(),
      ...(waMessageId && { metadata: { wa_message_id: waMessageId } }),
    });

    if (sender.type === 'user' && (origin === 'whatsapp' || origin === 'telegram')) {
      FollowUpScheduler.scheduleFollowUps({
        chatId,
        origin: origin as 'whatsapp' | 'telegram',
        workspaceId: chat?.workspace_id ?? null,
        leadId: chat?.lead_id,
        triggerState: 'BOT_PAUSED',
      }).catch(err => console.error('[sendMessage] Failed to schedule BOT_PAUSED follow-ups:', err));
    }

    return {
      success: true,
      data: newMessage,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: 'Failed to send message',
    };
  }
}
