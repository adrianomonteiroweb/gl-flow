import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';

import { createWhatsAppClient } from '@workspace/utils/whatsapp';
import type { MessageContent } from '@workspace/utils/whatsapp';
import { ChatRepository } from '@/repositories/ChatRepository';
import { MessageRepository } from '@/repositories/MessagesRepository';
import { getRequestUser } from '@/lib/api-auth';
import { db, chat_scheduled_messages_table, WaNumberRepository } from '@workspace/db';

type SendMessageBody = {
  chatId: string;
  content: MessageContent;
  agentId?: string;
  agentName?: string;
};

export async function POST(request: NextRequest) {
  if (!getRequestUser(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: SendMessageBody = await request.json();
    const { chatId, content, agentId, agentName } = body;

    if (!chatId || !content) {
      return NextResponse.json({ error: 'chatId and content are required' }, { status: 400 });
    }

    const chatWithLead = await ChatRepository.getChatWithLeadById(chatId);

    if (!chatWithLead) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const { lead, chat } = chatWithLead;

    if (!lead?.phone) {
      return NextResponse.json({ error: 'Lead has no phone number' }, { status: 422 });
    }

    const workspaceId = chat?.workspace_id ?? null;
    const [waNumber] = workspaceId ? await WaNumberRepository.findActiveByWorkspace(workspaceId) : [];

    if (!waNumber) {
      return NextResponse.json({ error: 'Integração WhatsApp não configurada.' }, { status: 422 });
    }

    const waClient = createWhatsAppClient({ phoneNumberId: waNumber.phone_number_id, accessToken: waNumber.access_token });
    const { messageId } = await waClient.sendMessage(lead.phone, content);

    const messageType = content.type === 'template' ? 'text' : content.type;
    const messageContent = content.type === 'text' ? content.body : content.type === 'template' ? content.name : content.url;

    await MessageRepository.create({
      chat_id: chatId,
      sender: {
        id: agentId ?? 'system',
        type: 'agent',
        name: agentName ?? 'Agente',
      },
      type: messageType,
      origin: 'whatsapp',
      content: messageContent,
      metadata: { wa_message_id: messageId },
      sent_at: new Date().toISOString(),
    });

    // Cancel pending follow-ups — human agent responded
    await db
      .update(chat_scheduled_messages_table)
      .set({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .where(and(eq(chat_scheduled_messages_table.chat_id, chatId), inArray(chat_scheduled_messages_table.status, ['pending'])));

    return NextResponse.json({ success: true, messageId }, { status: 200 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
