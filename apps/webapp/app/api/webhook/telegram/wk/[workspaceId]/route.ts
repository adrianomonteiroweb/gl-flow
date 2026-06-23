import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

import { WorkspaceIntegrationRepository, decryptToken } from '@workspace/db';
import { MessageRepository } from '@/repositories/MessagesRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { normalizeTelegramMessage } from '@/lib/conversation/normalizer';
import { ChatResolver } from '@/lib/conversation/resolver';
import { ConversationEngine } from '@/lib/conversation/engine';

type TelegramUser = { id: number; first_name: string; last_name?: string; username?: string };
type TelegramMessage = { message_id: number; from: TelegramUser; chat: { id: number; type: string }; text?: string; date: number };
type TelegramUpdate = { update_id: number; message?: TelegramMessage };

type TelegramCredentials = { botToken?: string; webhookSecret?: string };

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;

  const row = await WorkspaceIntegrationRepository.findByProvider(workspaceId, 'telegram');

  if (!row?.credentials) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let creds: TelegramCredentials;

  try {
    creds = JSON.parse(decryptToken(row.credentials)) as TelegramCredentials;
  } catch {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 500 });
  }

  const secretToken = request.headers.get('x-telegram-bot-api-secret-token');

  if (!creds.webhookSecret || !secretToken || !safeEqual(secretToken, creds.webhookSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;

  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;

  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const senderName = [message.from.first_name, message.from.last_name].filter(Boolean).join(' ');

  try {
    const incomingMsg = normalizeTelegramMessage({
      telegramChatId: message.chat.id,
      senderName,
      text: message.text,
      date: message.date,
    });

    const { lead, chat, workspace, leadCreated, chatCreated } = await ChatResolver.resolve(incomingMsg, { workspaceId });

    await MessageRepository.create({
      chat_id: chat.id,
      sender: { id: String(message.chat.id), type: 'lead', name: senderName },
      type: 'text',
      origin: 'telegram',
      content: message.text ?? '',
      sent_at: incomingMsg.timestamp.toISOString(),
    });

    await ChatRepository.update(chat.id, { updated_at: new Date().toISOString() });

    await ConversationEngine.processMessage(incomingMsg, {
      lead,
      chat,
      workspace,
      waNumber: null,
      telegramBotToken: creds.botToken ?? null,
      chatCreated,
      leadCreated,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook][workspace] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
