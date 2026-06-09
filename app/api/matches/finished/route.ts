import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    initDb();
    const db = getDatabase();

    const matches = db
      .prepare(
        `
        SELECT * FROM matches
        WHERE result1 IS NOT NULL AND result2 IS NOT NULL
        ORDER BY date DESC
      `
      )
      .all();

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Finished matches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
