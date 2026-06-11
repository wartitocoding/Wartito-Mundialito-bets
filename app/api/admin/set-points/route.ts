import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest, bodyToken?: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const query = req.nextUrl.searchParams.get('token');
  return header === expected || query === expected || bodyToken === expected;
}

/**
 * Asigna el puntaje "base" (manualPoints) de un jugador — el que traía antes
 * de que se perdiera la DB. Las apuestas nuevas suman ENCIMA de este valor.
 *
 * POST body JSON:
 *   { "token": "...", "assignments": [ { "name": "Javiera Restini", "points": 15 }, ... ] }
 *   (también acepta "email" en vez de "name")
 *
 * Protegido por ADMIN_TOKEN (header Authorization: Bearer, ?token= o en el body).
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}

  if (!authorized(req, body?.token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assignments = Array.isArray(body?.assignments) ? body.assignments : null;
  if (!assignments) {
    return NextResponse.json({ error: 'Falta "assignments": [{ name|email, points }]' }, { status: 400 });
  }

  try {
    initDb();
    const db = getDatabase();
    const byEmail = db.prepare('UPDATE users SET manualPoints = ? WHERE email = ?');
    const byName = db.prepare('UPDATE users SET manualPoints = ? WHERE LOWER(name) = LOWER(?)');

    const applied: any[] = [];
    const notFound: any[] = [];
    for (const a of assignments) {
      const points = Math.trunc(Number(a.points));
      if (!Number.isFinite(points)) { notFound.push({ ...a, reason: 'points inválido' }); continue; }
      let res;
      if (a.email) res = byEmail.run(points, a.email);
      else if (a.name) res = byName.run(points, a.name);
      else { notFound.push({ ...a, reason: 'falta name/email' }); continue; }
      if (res.changes > 0) applied.push({ target: a.email || a.name, points });
      else notFound.push({ ...a, reason: 'jugador no encontrado' });
    }

    return NextResponse.json({ ok: true, applied, notFound });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
