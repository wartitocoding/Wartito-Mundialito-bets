import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest) {
  try {
    initDb();
    const db = getDatabase();

    const now = new Date().toISOString();

    const matches = db
      .prepare(
        `
        SELECT * FROM matches
        WHERE date > ?
        ORDER BY date ASC
        LIMIT 20
      `
      )
      .all(now);

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Upcoming matches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
