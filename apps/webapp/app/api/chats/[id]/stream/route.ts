import { NextRequest } from 'next/server';
import { MessageRepository } from '@/repositories/MessagesRepository';
import { verifyJWT } from '@workspace/utils/jwt';

export const dynamic = 'force-dynamic';

const COOKIE_KEY = 'glhonda_DOC_AT';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookie = request.cookies.get(COOKIE_KEY);
  if (!cookie?.value) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const token = Buffer.from(cookie.value, 'base64').toString();
    const session = verifyJWT(token, process.env.TOKEN_KEY || '');
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id: chatId } = await params;
  const sinceParam = request.nextUrl.searchParams.get('since');
  let since = sinceParam ? new Date(sinceParam) : new Date();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, 15000);

      const poll = setInterval(async () => {
        try {
          const newMessages = await MessageRepository.getNewMessagesByChatSince(chatId, since);
          if (newMessages.length > 0) {
            const lastMessage = newMessages.at(-1);
            if (lastMessage && lastMessage.message && lastMessage.message.created_at) {
              since = new Date(lastMessage.message.created_at as string | number | Date);
            }
            send({ type: 'messages', data: newMessages });
          }
        } catch {
          // ignore transient DB errors
        }
      }, 3000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        clearInterval(poll);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
