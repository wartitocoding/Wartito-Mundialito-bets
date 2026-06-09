import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  return decoded;
}

export function requireAuth(req: NextRequest) {
  const auth = verifyAuth(req);
  if (!auth) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
