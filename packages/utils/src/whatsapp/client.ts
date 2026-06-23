import crypto from 'crypto';
import type {
  WhatsAppSendTextPayload,
  WhatsAppSendImagePayload,
  WhatsAppSendAudioPayload,
  WhatsAppSendDocumentPayload,
  WhatsAppSendTemplatePayload,
  WhatsAppSendResponse,
  WhatsAppMediaUrlResponse,
  MessageContent,
  SendMessageResponse,
} from './types';

const GRAPH_API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export const buildAppSecretProof = (accessToken: string, appSecret: string): string =>
  crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');

const ALLOWED_MEDIA_DOMAINS = ['graph.facebook.com', 'lookaside.fbsbx.com', 'mmg.whatsapp.net', 'media.whatsapp.net'];
const HTTP_TIMEOUT_MS = 10_000;

const fetchWithTimeout = (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
};

const makeRequest = async <T>(url: string, options: RequestInit): Promise<T> => {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`WhatsApp API error (${response.status}): ${JSON.stringify(error)}`);
  }

  return response.json() as Promise<T>;
};

export const createWhatsAppClient = (config: { phoneNumberId: string; accessToken: string }) => {
  const { phoneNumberId, accessToken } = config;

  const sendTextMessage = async (to: string, message: string): Promise<WhatsAppSendResponse> => {
    const payload: WhatsAppSendTextPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: message },
    };

    return makeRequest<WhatsAppSendResponse>(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };

  const sendImageMessage = async (to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResponse> => {
    const payload: WhatsAppSendImagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: { link: imageUrl, ...(caption && { caption }) },
    };

    return makeRequest<WhatsAppSendResponse>(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };

  const getMediaUrl = async (mediaId: string): Promise<WhatsAppMediaUrlResponse> =>
    makeRequest<WhatsAppMediaUrlResponse>(`${BASE_URL}/${mediaId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

  const downloadMedia = async (url: string): Promise<{ buffer: Buffer; contentType: string }> => {
    const urlObj = new URL(url);

    if (!ALLOWED_MEDIA_DOMAINS.includes(urlObj.hostname)) {
      throw new Error(`Media download blocked: domain '${urlObj.hostname}' not in allowlist`);
    }

    const response = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return { buffer: Buffer.from(arrayBuffer), contentType };
  };

  const sendMessage = async (to: string, content: MessageContent): Promise<SendMessageResponse> => {
    let payload:
      | WhatsAppSendTextPayload
      | WhatsAppSendImagePayload
      | WhatsAppSendAudioPayload
      | WhatsAppSendDocumentPayload
      | WhatsAppSendTemplatePayload;

    if (content.type === 'text') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: content.body },
      } satisfies WhatsAppSendTextPayload;
    } else if (content.type === 'image') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: { link: content.url, ...(content.caption && { caption: content.caption }) },
      } satisfies WhatsAppSendImagePayload;
    } else if (content.type === 'audio') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'audio',
        audio: { link: content.url },
      } satisfies WhatsAppSendAudioPayload;
    } else if (content.type === 'document') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: {
          link: content.url,
          ...(content.filename && { filename: content.filename }),
          ...(content.caption && { caption: content.caption }),
        },
      } satisfies WhatsAppSendDocumentPayload;
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: content.name,
          language: { code: content.language },
          ...(content.components && { components: content.components }),
        },
      } satisfies WhatsAppSendTemplatePayload;
    }

    const response = await makeRequest<WhatsAppSendResponse>(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { messageId: response.messages?.[0]?.id ?? '' };
  };

  const markAsRead = async (messageId: string): Promise<void> => {
    await makeRequest(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  };

  return { sendTextMessage, sendImageMessage, getMediaUrl, downloadMedia, sendMessage, markAsRead };
};
