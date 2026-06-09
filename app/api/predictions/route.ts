import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    const predictions = db
      .prepare('SELECT * FROM predictions WHERE userId = ? ORDER BY createdAt DESC')
      .all(auth.userId);

    return NextResponse.json(predictions);
  } catch (error) {
    console.error('Get predictions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId, prediction1, prediction2 } = await req.json();

    if (typeof prediction1 !== 'number' || typeof prediction2 !== 'number') {
      return NextResponse.json(
        { error: 'prediction1 y prediction2 deben ser números' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    // Check if match has already started
    const matchDate = new Date(match.date).getTime();
    if (matchDate < Date.now()) {
      return NextResponse.json(
        { error: 'No puedes apostar en partidos que ya comenzaron' },
        { status: 400 }
      );
    }

    const existing = db
      .prepare('SELECT * FROM predictions WHERE userId = ? AND matchId = ?')
      .get(auth.userId, matchId);

    if (existing) {
      db.prepare('UPDATE predictions SET prediction1 = ?, prediction2 = ? WHERE id = ?').run(
        prediction1,
        prediction2,
        existing.id
      );
      const updated = db.prepare('SELECT * FROM predictions WHERE id = ?').get(existing.id);
      return NextResponse.json(updated);
    }

    const result = db
      .prepare(
        'INSERT INTO predictions (userId, matchId, prediction1, prediction2, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
      .run(auth.userId, matchId, prediction1, prediction2, Date.now());

    const prediction = db
      .prepare('SELECT * FROM predictions WHERE id = ?')
      .get(result.lastInsertRowid);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Create prediction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
