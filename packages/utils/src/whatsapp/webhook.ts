import crypto from 'crypto';
import type {
  WhatsAppWebhookPayload,
  ParsedWhatsAppMessage,
  ParsedWhatsAppStatus,
} from './types';

export const verifyWebhookSignature = (
  rawBody: string,
  signature: string,
  appSecret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const expected = Buffer.from(`sha256=${expectedSignature}`);
  const received = Buffer.from(signature);

  // Use timing-safe comparison to prevent timing attacks.
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

export const parseWebhookPayload = (
  body: WhatsAppWebhookPayload
): { messages: ParsedWhatsAppMessage[]; statuses: ParsedWhatsAppStatus[] } => {
  const messages: ParsedWhatsAppMessage[] = [];
  const statuses: ParsedWhatsAppStatus[] = [];

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const { value } = change;

      if (value.messages) {
        const contactMap = new Map(
          (value.contacts || []).map(c => [c.wa_id, c.profile.name])
        );

        for (const msg of value.messages) {
          const parsed: ParsedWhatsAppMessage = {
            waMessageId: msg.id,
            from: msg.from,
            profileName: contactMap.get(msg.from) || msg.from,
            timestamp: msg.timestamp,
            type: msg.type,
          };

          if (msg.type === 'text' && msg.text) {
            parsed.text = msg.text.body;
          } else if (msg.type === 'image' && msg.image) {
            parsed.mediaId = msg.image.id;
            parsed.mediaMimeType = msg.image.mime_type;
            parsed.caption = msg.image.caption;
          }

          messages.push(parsed);
        }
      }

      if (value.statuses) {
        for (const status of value.statuses) {
          statuses.push({
            waMessageId: status.id,
            status: status.status,
            timestamp: status.timestamp,
            recipientId: status.recipient_id,
          });
        }
      }
    }
  }

  return { messages, statuses };
};
