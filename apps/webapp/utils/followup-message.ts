import { ResponseSender } from '@/lib/conversation/sender';
import type { WaNumber } from '@/lib/conversation/types';
import { normalizePhoneBR } from '@workspace/utils/notifications';

export const FOLLOWUP_STEPS: Record<number, { delay_ms: number; message: string }> = {
  1: {
    delay_ms: 15 * 60 * 1000,
    message:
      'Olá 😊 Só passando para confirmar se ainda deseja atendimento, estou na expectativa para dar continuidade, te garanto a melhor experiência pois nossos serviços e produtos foram pensados para resolver os seus problemas. Continuo a sua disposição.',
  },
  2: {
    delay_ms: 2 * 60 * 60 * 1000,
    message:
      'Olá 😊 Só passando para confirmar se ainda deseja atendimento, estou na expectativa para dar continuidade, te garanto a melhor experiência pois nossos serviços e produtos foram pensados para resolver os seus problemas. Continuo a sua disposição.',
  },
  3: {
    delay_ms: 24 * 60 * 60 * 1000,
    message: 'Olá! Só para reforçar que nossa equipe está disponível caso precise de suporte. 😊',
  },
  4: {
    delay_ms: 72 * 60 * 60 * 1000,
    message: 'Oi! Se tiver alguma dúvida ou precisar de ajuda, é só nos chamar. Estamos à disposição! 😊',
  },
  5: {
    delay_ms: 7 * 24 * 60 * 60 * 1000,
    message: 'Olá! Passando para dizer que continuamos aqui. Se precisar de algo, pode contar com a gente! 😊',
  },
};

export const sendFollowUpMessage = async (params: {
  chatId: string;
  origin: 'whatsapp' | 'telegram';
  phone?: string;
  telegramChatId?: number;
  stepOrder: number;
  /** Message text from flow_config — falls back to hardcoded FOLLOWUP_STEPS if absent. */
  messageText?: string | null;
  /** Template name from flow_config — passed to ResponseSender for 24h window check. */
  templateName?: string | null;
  /** WA number record — used to build the per-number API client. */
  waNumber?: WaNumber | null;
  /** Telegram bot token — per-workspace; required to send Telegram follow-ups. */
  telegramBotToken?: string | null;
}): Promise<void> => {
  const { chatId, origin, phone, telegramChatId, stepOrder, messageText, templateName, waNumber, telegramBotToken } = params;

  // Prefer flow_config text; fall back to hardcoded step message.
  const fallbackStep = FOLLOWUP_STEPS[stepOrder];
  const text = messageText ?? fallbackStep?.message ?? '';

  if (!text && !templateName) {
    throw new Error(`No message content for follow-up chat=${chatId} step=${stepOrder}`);
  }

  // For WA: normalise phone; for Telegram: use the string chat ID as recipient.
  const to = origin === 'whatsapp' ? normalizePhoneBR(phone ?? '') : String(telegramChatId ?? '');

  if (!to) {
    throw new Error(`No recipient for follow-up chat=${chatId} step=${stepOrder}`);
  }

  // ResponseSender handles 24h window detection and template vs. free-text decision.
  await ResponseSender.send({
    channel: origin,
    to,
    chatId,
    text,
    waNumber: waNumber ?? null,
    telegramBotToken: telegramBotToken ?? null,
    templateName: templateName ?? undefined,
  });
};
