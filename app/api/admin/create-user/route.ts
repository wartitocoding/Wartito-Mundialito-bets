import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { createUser, getUserByEmail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest, bodyToken?: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const query = req.nextUrl.searchParams.get('token');
  return header === expected || query === expected || bodyToken === expected;
}

/**
 * Crea una cuenta de jugador directamente (sin pasar por la whitelist del
 * registro público). Para que el organizador agregue amigos.
 *
 * POST body: { token, email, password, name, championPrediction? }
 * championPrediction por defecto "Por definir" → el jugador lo elige al entrar.
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}

  if (!authorized(req, body?.token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, password, name, championPrediction } = body;
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'email, password y name son requeridos' }, { status: 400 });
  }

  try {
    initDb();
    if (getUserByEmail(email)) {
      return NextResponse.json({ error: 'Ese email ya tiene cuenta' }, { status: 409 });
    }
    const ok = createUser(email, password, name, championPrediction || 'Por definir');
    if (!ok) {
      return NextResponse.json({ error: 'No se pudo crear la cuenta' }, { status: 500 });
    }
    const user = getUserByEmail(email);
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
