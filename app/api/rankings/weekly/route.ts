import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    initDb();
    const db = getDatabase();

    const weekNumber = new Date().getWeek();
    const year = new Date().getFullYear();

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
