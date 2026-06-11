import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { maybeSyncResults } from '@/lib/auto-sync';

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest) {
  try {
    initDb();
    const db = getDatabase();
    maybeSyncResults(db); // fire-and-forget

    const rankings = db
      .prepare(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.championPrediction,
          u.championPoints,
          COUNT(p.id) as totalPredictions,
          SUM(CASE WHEN p.points > 0 THEN 1 ELSE 0 END) as correctPredictions,
          SUM(p.points) as matchPoints,
          (COALESCE(SUM(p.points), 0) + COALESCE(u.championPoints, 0)) as totalPoints
        FROM users u
        LEFT JOIN predictions p ON u.id = p.userId
        GROUP BY u.id
        ORDER BY totalPoints DESC, matchPoints DESC, correctPredictions DESC
      `)
      .all();

    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Rankings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
