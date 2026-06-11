import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    initDb();
    const db = getDatabase();

    const matches = db.prepare(`
      SELECT id, team1, team2, stage, date, status, result1, result2
      FROM matches ORDER BY date ASC LIMIT 20
    `).all();

    const predictions = db.prepare(`
      SELECT p.id, p.matchId, p.userId, p.betType, p.prediction1, p.prediction2,
             p.isWildcard, p.points, u.name as userName,
             m.team1, m.team2, m.date as matchDate, m.status as matchStatus
      FROM predictions p
      JOIN users u ON p.userId = u.id
      JOIN matches m ON p.matchId = m.id
      ORDER BY p.createdAt DESC
    `).all();

    const users = db.prepare('SELECT id, name, email FROM users').all();

    return NextResponse.json({
      now: new Date().toISOString(),
      counts: {
        matches: (db.prepare('SELECT COUNT(*) as c FROM matches').get() as any).c,
        predictions: (db.prepare('SELECT COUNT(*) as c FROM predictions').get() as any).c,
        users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
      },
      users,
      recentMatches: matches,
      allPredictions: predictions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
