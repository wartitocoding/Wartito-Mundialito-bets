import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function GET(_: NextRequest) {
  try {
    initDb();
    const db = getDatabase();

    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const year = now.getFullYear();

    const weeklyRanking = db
      .prepare(
        `
        SELECT
          u.id,
          u.name,
          COUNT(p.id) as totalPredictions,
          SUM(CASE WHEN p.points = 3 THEN 1 ELSE 0 END) as exactMatches,
          SUM(CASE WHEN p.points > 0 THEN 1 ELSE 0 END) as correctPredictions,
          SUM(p.points) as points
        FROM users u
        LEFT JOIN predictions p ON u.id = p.userId
        LEFT JOIN matches m ON p.matchId = m.id
        WHERE strftime('%W', m.date) = ? OR p.createdAt IS NULL
        GROUP BY u.id
        ORDER BY points DESC, exactMatches DESC
      `
      )
      .all(String(weekNumber).padStart(2, '0'));

    return NextResponse.json({
      week: weekNumber,
      year,
      rankings: weeklyRanking,
    });
  } catch (error) {
    console.error('Weekly ranking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
