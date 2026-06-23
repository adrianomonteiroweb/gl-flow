import { MessageRepository } from '@/repositories/MessagesRepository';
import { WaNumberRepository } from '@workspace/db';
import { createWhatsAppClient } from '@workspace/utils/whatsapp';
import { sendTelegramMessage } from '@/utils/telegram';
import { resolveTelegramBotToken } from '@/lib/telegram';
import { normalizePhoneBR } from '@workspace/utils/notifications';

export const CLOSED_WON_MESSAGE =
  '🎉 Seja muito bem-vindo(a)!\nÉ um prazer ter você conosco. Esperamos proporcionar a melhor experiência possível nessa nova jornada.\nObrigado pela confiança! 🚀';

const SYSTEM_SENDER = { id: 'system', type: 'user' as const, name: 'Atendimento Automático' };

export const sendClosedWonMessage = async (params: {
  chatId: string;
  workspaceId?: string | null;
  origin: 'whatsapp' | 'telegram';
  phone?: string;
  telegramChatId?: number;
}): Promise<void> => {
  const { chatId, workspaceId, origin, phone, telegramChatId } = params;

  try {
    if (origin === 'whatsapp' && phone) {
      const [waNumber] = workspaceId ? await WaNumberRepository.findActiveByWorkspace(workspaceId) : [];

      if (!waNumber) {
        console.error('[sendClosedWonMessage] Integração WhatsApp não configurada — mensagem não enviada.');
        return;
      }

      const waClient = createWhatsAppClient({ phoneNumberId: waNumber.phone_number_id, accessToken: waNumber.access_token });
      await waClient.sendTextMessage(normalizePhoneBR(phone), CLOSED_WON_MESSAGE).catch(console.error);
    } else if (origin === 'telegram' && telegramChatId) {
      const botToken = await resolveTelegramBotToken(workspaceId);

      if (!botToken) {
        console.error('[sendClosedWonMessage] Integração Telegram não configurada — mensagem não enviada.');
        return;
      }

      await sendTelegramMessage(telegramChatId, CLOSED_WON_MESSAGE, botToken).catch(console.error);
    }

    await MessageRepository.create({
      chat_id: chatId,
      sender: SYSTEM_SENDER,
      type: 'text',
      origin,
      content: CLOSED_WON_MESSAGE,
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[sendClosedWonMessage] Error:', error);
  }
};
