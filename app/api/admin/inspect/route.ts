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

// Diagnóstico temporal: por jugador, cuántas apuestas y en qué ventana de tiempo
// se crearon (para detectar spree/bug). Protegido por ADMIN_TOKEN.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    initDb();
    const db = getDatabase();
    const perUser = db.prepare(`
      SELECT u.name AS userName,
             COUNT(p.id) AS n,
             MIN(p.createdAt) AS firstAt,
             MAX(p.createdAt) AS lastAt,
             COUNT(DISTINCT p.matchId) AS distinctMatches
      FROM predictions p JOIN users u ON p.userId = u.id
      GROUP BY u.id ORDER BY n DESC
    `).all() as any[];

    // Detalle de la cuenta con más apuestas (timestamps de las últimas 15)
    const top = perUser[0];
    let topDetail: any[] = [];
    if (top) {
      topDetail = db.prepare(`
        SELECT p.createdAt, p.betType, p.prediction1, p.prediction2, m.team1, m.team2
        FROM predictions p
        JOIN users u ON p.userId = u.id
        JOIN matches m ON p.matchId = m.id
        WHERE u.name = ?
        ORDER BY p.createdAt DESC LIMIT 15
      `).all(top.userName) as any[];
    }

    return NextResponse.json({
      perUser: perUser.map(r => ({
        userName: r.userName, apuestas: r.n, distinctMatches: r.distinctMatches,
        firstAt: new Date(r.firstAt).toISOString(),
        lastAt: new Date(r.lastAt).toISOString(),
        spanMin: Math.round((r.lastAt - r.firstAt) / 60000),
      })),
      topAccountLast15: topDetail.map(d => ({
        at: new Date(d.createdAt).toISOString(),
        bet: d.betType, score: `${d.prediction1}-${d.prediction2}`, match: `${d.team1} vs ${d.team2}`,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
