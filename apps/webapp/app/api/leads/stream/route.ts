import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@workspace/utils/jwt';
import { LeadRepository } from '@/repositories/LeadRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get('linharesflow_DOC_AT');
  const token = rawCookie ? Buffer.from(rawCookie.value, 'base64').toString() : null;

  let userId: string | null = null;

  try {
    if (!token) {
      throw new Error('No token');
    }
    const decoded = verifyJWT(token);
    userId = (decoded as any)?.sub ?? null;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = userId ? await UserRepository.findById(userId) : null;
  const workspaceId = user ? await resolveWorkspaceId(user) : null;

  if (!workspaceId) {
    return new Response(JSON.stringify({ error: 'Workspace not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Ignora since do cliente para evitar clock skew — usa horário do servidor com buffer de 2s
  let since = new Date(Date.now() - 2000);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, 15000);

      const poll = setInterval(async () => {
        try {
          const updatedCount = await LeadRepository.getLeadsUpdatedSince(since, workspaceId);
          if (updatedCount > 0) {
            since = new Date();
            send({ type: 'leads_updated' });
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
      'X-Accel-Buffering': 'no', // desativa buffer do nginx para SSE funcionar em produção
    },
  });
}
