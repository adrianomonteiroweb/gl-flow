import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_ROUTES = ['/login', '/privacy-policy', '/reset-password', '/invite'];
const PUBLIC_PREFIXES = ['/api/webhook', '/api/webhooks'];

const isPublic = (pathname: string): boolean => {
  if (PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return true;
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true;
  return false;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/pipelines', request.url));
  }

  if (pathname.startsWith('/api/cron')) {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!isPublic(pathname)) {
    const rawCookie = request.cookies.get('glflow_DOC_AT')?.value;
    let authenticated = false;

    if (rawCookie) {
      try {
        const token = Buffer.from(rawCookie, 'base64').toString('utf-8');
        const secret = new TextEncoder().encode(process.env.TOKEN_KEY ?? '');
        await jwtVerify(token, secret);
        authenticated = true;
      } catch {
        authenticated = false;
      }
    }

    if (!authenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
