import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';
import { getCurrentStreak } from '@/lib/achievements';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Overall stats
    const overall = db
      .prepare(
        `
        SELECT
          COUNT(*) as totalPredictions,
          SUM(CASE WHEN points = 3 THEN 1 ELSE 0 END) as exactMatches,
          SUM(CASE WHEN points > 0 THEN 1 ELSE 0 END) as correctPredictions,
          SUM(points) as totalPoints,
          ROUND(100.0 * SUM(CASE WHEN points > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) as successRate
        FROM predictions
        WHERE userId = ?
      `
      )
      .get(auth.userId) as any;

    // Stats by team
    const byTeam = db
      .prepare(
        `
        SELECT
          m.team1 as team,
          COUNT(*) as predictions,
          SUM(CASE WHEN p.prediction1 > p.prediction2 AND (m.result1 > m.result2 OR m.result1 IS NULL) THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN p.points = 3 THEN 1 ELSE 0 END) as exactMatches,
          ROUND(100.0 * SUM(CASE WHEN p.points > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) as winRate
        FROM predictions p
        JOIN matches m ON p.matchId = m.id
        WHERE p.userId = ?
        GROUP BY m.team1
        ORDER BY winRate DESC
        LIMIT 10
      `
      )
      .all(auth.userId);

    // Weekly progression
    const weekly = db
      .prepare(
        `
        SELECT
          strftime('%W', m.date) as week,
          COUNT(*) as predictions,
          SUM(CASE WHEN p.points > 0 THEN 1 ELSE 0 END) as correct,
          SUM(p.points) as points
        FROM predictions p
        JOIN matches m ON p.matchId = m.id
        WHERE p.userId = ?
        GROUP BY week
        ORDER BY week DESC
        LIMIT 10
      `
      )
      .all(auth.userId);

    const streak = getCurrentStreak(auth.userId);

    return NextResponse.json({
      overall,
      byTeam,
      weekly,
      currentStreak: streak,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
