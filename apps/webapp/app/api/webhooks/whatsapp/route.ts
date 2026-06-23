import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { sql } from 'drizzle-orm';

import { verifyWebhookSignature, parseWebhookPayload, createWhatsAppClient } from '@workspace/utils/whatsapp';
import type { WhatsAppWebhookPayload, ParsedWhatsAppMessage } from '@workspace/utils/whatsapp';
import { MessageRepository } from '@/repositories/MessagesRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { db, messages_table, WaNumberRepository } from '@workspace/db';
import { S3 } from '@workspace/utils/aws/s3';
import { normalizeWhatsAppMessage } from '@/lib/conversation/normalizer';
import { ChatResolver } from '@/lib/conversation/resolver';
import { ConversationEngine } from '@/lib/conversation/engine';

const S3_BUCKET = process.env.S3_BUCKET || 'glflow-media';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    const match = await WaNumberRepository.findByVerifyToken(token);

    if (match?.verify_token) {
      const a = Buffer.from(token);
      const b = Buffer.from(match.verify_token);

      if (a.length === b.length && timingSafeEqual(a, b)) {
        return new NextResponse(challenge, { status: 200 });
      }
    }
  }

  console.error('[WhatsApp webhook] Verificação falhou (403).', {
    mode,
    hasToken: Boolean(token),
  });

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    if (process.env.NODE_ENV !== 'production') {
      console.log('📨 Webhook payload:', rawBody);
    }

    const body: WhatsAppWebhookPayload = JSON.parse(rawBody);

    const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    const waNumber = phoneNumberId ? await WaNumberRepository.findByPhoneNumberId(phoneNumberId) : null;

    if (waNumber?.app_secret) {
      const signature = request.headers.get('x-hub-signature-256') || '';
      if (!verifyWebhookSignature(rawBody, signature, waNumber.app_secret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const { messages, statuses } = parseWebhookPayload(body);

    for (const msg of messages) {
      await processIncomingMessage(msg, phoneNumberId);
    }

    for (const status of statuses) {
      await processStatusUpdate(status);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ success: true }, { status: 200 }); // Always return 200 to Meta
  }
}

async function processIncomingMessage(msg: ParsedWhatsAppMessage, phoneNumberId?: string) {
  const incomingMsg = normalizeWhatsAppMessage(msg);
  const { lead, chat, workspace, waNumber, leadCreated, chatCreated } = await ChatResolver.resolve(incomingMsg, phoneNumberId);

  if (!waNumber) {
    console.error('[WhatsApp webhook] Nenhum número configurado para phone_number_id:', phoneNumberId);
    return;
  }

  const waClient = createWhatsAppClient({ phoneNumberId: waNumber.phone_number_id, accessToken: waNumber.access_token });

  let content = '';
  let messageType = 'text';

  if (msg.type === 'text' && msg.text) {
    content = msg.text;
  } else if (msg.type === 'image' && msg.mediaId) {
    messageType = 'image';
    try {
      const mediaInfo = await waClient.getMediaUrl(msg.mediaId);
      const { buffer, contentType } = await waClient.downloadMedia(mediaInfo.url);
      const extension = contentType.split('/')[1] || 'jpg';
      const s3Key = `whatsapp/media/${msg.waMessageId}.${extension}`;
      await S3.uploadBuffer(S3_BUCKET, s3Key, buffer, contentType);
      content = s3Key;
    } catch (error) {
      console.error('Error downloading WhatsApp media:', error);
      content = '[Imagem não disponível]';
      messageType = 'text';
    }
  } else {
    content = `[${msg.type}]`;
  }

  await MessageRepository.create({
    chat_id: chat.id,
    sender: { id: lead.id, type: 'lead', name: msg.profileName },
    type: messageType,
    origin: 'whatsapp',
    content,
    metadata: {
      wa_message_id: msg.waMessageId,
      ...(msg.caption && { caption: msg.caption }),
    },
    received_at: incomingMsg.timestamp.toISOString(),
  });

  await ChatRepository.update(chat.id, { updated_at: new Date().toISOString() });

  await waClient.markAsRead(msg.waMessageId).catch(() => {});

  await ConversationEngine.processMessage(incomingMsg, {
    lead,
    chat,
    workspace,
    waNumber,
    chatCreated,
    leadCreated,
  });
}

async function processStatusUpdate(status: { waMessageId: string; status: string; timestamp: string; recipientId: string }) {
  const results = await db
    .select({ message: messages_table })
    .from(messages_table)
    .where(sql`${messages_table.metadata}->>'wa_message_id' = ${status.waMessageId}`)
    .limit(1);

  if (!results.length) {
    return;
  }

  const message = results[0]!.message;
  const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();
  const updateData: Record<string, string> = {};

  if (status.status === 'delivered') {
    updateData.received_at = timestamp;
  } else if (status.status === 'read') {
    updateData.viewed_at = timestamp;
  }

  if (Object.keys(updateData).length > 0) {
    await MessageRepository.update(message.id, updateData);
  }
}
