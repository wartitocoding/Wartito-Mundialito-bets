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

    const parlays = db
      .prepare(
        `
        SELECT
          p.*,
          json_array_length(json(p.matches)) as matchCount
        FROM parlays p
        WHERE p.userId = ?
        ORDER BY p.createdAt DESC
      `
      )
      .all(auth.userId);

    return NextResponse.json(parlays);
  } catch (error) {
    console.error('Get parlays error:', error);
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

    const { matchIds, multiplier = 1.5 } = await req.json();

    if (!Array.isArray(matchIds) || matchIds.length < 2) {
      return NextResponse.json(
        { error: 'Se requieren al menos 2 partidos para un parlay' },
        { status: 400 }
      );
    }

    if (multiplier < 1 || multiplier > 3) {
      return NextResponse.json(
        { error: 'Multiplicador debe estar entre 1 y 3' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Validate matches exist
    const matches = db
      .prepare(`SELECT id FROM matches WHERE id IN (${matchIds.map(() => '?').join(',')})`)
      .all(...matchIds);

    if (matches.length !== matchIds.length) {
      return NextResponse.json(
        { error: 'Algunos partidos no existen' },
        { status: 404 }
      );
    }

    // Calculate potential points
    const totalPossiblePoints = matchIds.length * 3 * multiplier;

    const result = db
      .prepare(
        'INSERT INTO parlays (userId, matches, multiplier, totalPossiblePoints, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        auth.userId,
        JSON.stringify(matchIds),
        multiplier,
        Math.floor(totalPossiblePoints),
        Date.now()
      );

    const parlay = db
      .prepare('SELECT * FROM parlays WHERE id = ?')
      .get(result.lastInsertRowid);

    return NextResponse.json(parlay);
  } catch (error) {
    console.error('Create parlay error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
