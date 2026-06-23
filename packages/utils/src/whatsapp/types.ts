// WhatsApp Cloud API Types

// --- Webhook Payload Types ---

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppChangeValue;
  field: 'messages';
}

export interface WhatsAppChangeValue {
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppIncomingMessage[];
  statuses?: WhatsAppStatusUpdate[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

// --- Incoming Message Types ---

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: { body: string };
  image?: WhatsAppMediaInfo;
  video?: WhatsAppMediaInfo;
  audio?: WhatsAppMediaInfo;
  document?: WhatsAppMediaInfo & { filename?: string };
  reaction?: { message_id: string; emoji: string };
}

export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'reaction'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'unsupported';

export interface WhatsAppMediaInfo {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

// --- Status Update Types ---

export interface WhatsAppStatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: WhatsAppError[];
}

export interface WhatsAppError {
  code: number;
  title: string;
  message?: string;
}

// --- Send Message Types ---

export interface WhatsAppSendTextPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: { body: string };
}

export interface WhatsAppSendImagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'image';
  image: { link: string; caption?: string };
}

export interface WhatsAppSendAudioPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'audio';
  audio: { link: string };
}

export interface WhatsAppSendDocumentPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'document';
  document: { link: string; filename?: string; caption?: string };
}

export interface WhatsAppSendTemplatePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: any[];
  };
}

export interface WhatsAppSendResponse {
  messaging_product: 'whatsapp';
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

// --- Unified Send Content Types ---

export type TextContent = { type: 'text'; body: string };

export type TemplateContent = {
  type: 'template';
  name: string;
  language: string;
  components?: any[];
};

export type MediaContent =
  | { type: 'image'; url: string; caption?: string }
  | { type: 'audio'; url: string }
  | { type: 'document'; url: string; filename?: string; caption?: string };

export type MessageContent = TextContent | TemplateContent | MediaContent;

export type SendMessageResponse = { messageId: string };

export interface WhatsAppMediaUrlResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
  messaging_product: 'whatsapp';
}

// --- Parsed Webhook Data ---

export interface ParsedWhatsAppMessage {
  waMessageId: string;
  from: string;
  profileName: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: string;
  mediaId?: string;
  mediaMimeType?: string;
  caption?: string;
}

export interface ParsedWhatsAppStatus {
  waMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipientId: string;
}
