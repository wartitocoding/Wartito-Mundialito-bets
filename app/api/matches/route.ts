import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export async function GET(_: NextRequest) {
  try {
    initDb();
    const db = getDatabase();

    const matches = db.prepare('SELECT * FROM matches ORDER BY date ASC').all();

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Matches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    initDb();
    const db = getDatabase();

    const { team1, team2, stage, date, externalId } = await req.json();

    const result = db
      .prepare(
        'INSERT INTO matches (team1, team2, stage, date, externalId, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(team1, team2, stage, date, externalId, Date.now());

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json(match);
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
