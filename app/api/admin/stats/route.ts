import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Simple auth check
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const adminToken = process.env.ADMIN_TOKEN || 'admin-secret';

    if (token !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    initDb();
    const db = getDatabase();

    // Total users
    const totalUsers = db
      .prepare('SELECT COUNT(*) as count FROM users')
      .get() as any;

    // Total matches
    const totalMatches = db
      .prepare('SELECT COUNT(*) as count FROM matches')
      .get() as any;

    // Total predictions
    const totalPredictions = db
      .prepare('SELECT COUNT(*) as count FROM predictions')
      .get() as any;

    // Average accuracy
    const accuracy = db
      .prepare(
        `
        SELECT
          ROUND(100.0 * SUM(CASE WHEN points > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) as avgAccuracy
        FROM predictions
      `
      )
      .get() as any;

    // Top predictors
    const topPredictors = db
      .prepare(
        `
        SELECT
          u.id,
          u.name,
          COUNT(p.id) as totalPredictions,
          SUM(CASE WHEN p.points = 3 THEN 1 ELSE 0 END) as exactMatches,
          SUM(p.points) + COALESCE(u.championPoints, 0) as totalPoints
        FROM users u
        LEFT JOIN predictions p ON u.id = p.userId
        GROUP BY u.id
        ORDER BY totalPoints DESC
        LIMIT 10
      `
      )
      .all();

    // Recent matches
    const recentMatches = db
      .prepare(
        `
        SELECT * FROM matches
        ORDER BY date DESC
        LIMIT 20
      `
      )
      .all();

    return NextResponse.json({
      totalUsers: totalUsers.count,
      totalMatches: totalMatches.count,
      totalPredictions: totalPredictions.count,
      avgAccuracy: accuracy.avgAccuracy || 0,
      topPredictors,
      recentMatches,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
