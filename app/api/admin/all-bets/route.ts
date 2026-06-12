import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const query = req.nextUrl.searchParams.get('token');
  return header === expected || query === expected;
}

/**
 * Vista de ADMIN: todas las apuestas registradas, con jugador y partido.
 * Protegida por ADMIN_TOKEN. OJO: incluye apuestas de partidos que aún no
 * empiezan (normalmente secretas hasta el inicio), así que es solo para el
 * organizador.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    initDb();
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT u.name AS userName,
             m.id AS matchId, m.team1, m.team2, m.stage, m.date, m.status,
             m.result1, m.result2,
             p.betType, p.prediction1, p.prediction2, p.isWildcard, p.points,
             p.createdAt
      FROM predictions p
      JOIN users u ON p.userId = u.id
      JOIN matches m ON p.matchId = m.id
      ORDER BY m.date ASC, u.name ASC
    `).all();
    return NextResponse.json({ count: rows.length, bets: rows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
