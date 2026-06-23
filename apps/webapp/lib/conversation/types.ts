import type { workspaces_table, leads_table, chats_table, wa_numbers_table } from '@workspace/db';

export type ConversationState =
  | 'AWAITING_NAME'
  | 'AWAITING_ADDRESS_ZIP'
  | 'AWAITING_ADDRESS_STREET'
  | 'AWAITING_ADDRESS_NUMBER'
  | 'AWAITING_ADDRESS_CONFIRMATION'
  | 'AWAITING_PLAN_SELECTION'
  | 'QUALIFIED'
  | 'BOT_PAUSED'
  | 'INACTIVE'
  | 'CLOSED';

export type MessageChannel = 'whatsapp' | 'telegram';

export type IncomingMessage = {
  waMessageId?: string;
  channel: MessageChannel;
  /** Normalized phone (+5511...) for WA; String(telegramChatId) for Telegram */
  from: string;
  profileName: string;
  text?: string;
  type: string;
  mediaId?: string;
  mediaMimeType?: string;
  caption?: string;
  timestamp: Date;
};

export type Workspace = typeof workspaces_table.$inferSelect;
export type Lead = typeof leads_table.$inferSelect;
export type Chat = typeof chats_table.$inferSelect;
export type WaNumber = typeof wa_numbers_table.$inferSelect;

export type ConversationContext = {
  lead: Lead;
  chat: Chat;
  workspace: Workspace | null;
  waNumber: WaNumber | null;
  /** Per-workspace Telegram bot token for outbound replies; null falls back to the env bot. */
  telegramBotToken?: string | null;
  chatCreated?: boolean;
  leadCreated?: boolean;
};

export type HandlerResult = {
  nextState?: ConversationState;
  sendMessages?: Array<{ text: string; templateName?: string }>;
  leadUpdates?: Record<string, unknown>;
  chatPayloadUpdates?: Record<string, unknown>;
  chatUpdates?: Record<string, unknown>;
  cancelFollowUps?: boolean;
  rescheduleFollowUps?: boolean;
};

export type ConversationResult = {
  handled: boolean;
  error?: Error;
};

export interface StateHandler {
  canHandle(state: ConversationState | null): boolean;
  handle(msg: IncomingMessage, ctx: ConversationContext): Promise<HandlerResult>;
}
