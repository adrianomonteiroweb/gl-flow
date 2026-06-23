import type { ParsedWhatsAppMessage } from '@workspace/utils/whatsapp';
import { normalizePhoneBR } from '@workspace/utils/notifications';
import type { IncomingMessage } from './types';

export const normalizeWhatsAppMessage = (msg: ParsedWhatsAppMessage): IncomingMessage => ({
  waMessageId: msg.waMessageId,
  channel: 'whatsapp',
  from: `+${normalizePhoneBR(msg.from)}`,
  profileName: msg.profileName,
  text: msg.text,
  type: msg.type,
  mediaId: msg.mediaId,
  mediaMimeType: msg.mediaMimeType,
  caption: msg.caption,
  timestamp: new Date(parseInt(msg.timestamp) * 1000),
});

export const normalizeTelegramMessage = (params: {
  telegramChatId: number;
  senderName: string;
  text?: string;
  date: number;
}): IncomingMessage => ({
  channel: 'telegram',
  from: String(params.telegramChatId),
  profileName: params.senderName,
  text: params.text,
  type: 'text',
  timestamp: new Date(params.date * 1000),
});
