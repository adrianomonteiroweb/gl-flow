import { NextRequest } from 'next/server';
import { verifyJWT } from '@workspace/utils/jwt';

export const getRequestUser = (request: NextRequest): { sub: string; email: string } | null => {
  const rawCookie = request.cookies.get('linharesflow_DOC_AT')?.value;
  if (!rawCookie) return null;

  try {
    const token = Buffer.from(rawCookie, 'base64').toString('utf-8');
    const decoded = verifyJWT(token, process.env.TOKEN_KEY ?? '') as any;
    if (!decoded?.sub) return null;
    return { sub: decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
};
