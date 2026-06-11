import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    const challenges = db
      .prepare(
        `
        SELECT
          c.*,
          u1.name as user1Name,
          u2.name as user2Name
        FROM challenges c
        JOIN users u1 ON c.user1Id = u1.id
        JOIN users u2 ON c.user2Id = u2.id
        WHERE c.user1Id = ? OR c.user2Id = ?
        ORDER BY c.createdAt DESC
      `
      )
      .all(auth.userId, auth.userId);

    return NextResponse.json(challenges);
  } catch (error) {
    console.error('Get challenges error:', error);
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

    const { opponentId } = await req.json();

    if (!opponentId) {
      return NextResponse.json(
        { error: 'opponentId is required' },
        { status: 400 }
      );
    }

    if (opponentId === auth.userId) {
      return NextResponse.json(
        { error: 'No puedes desafiarte a ti mismo' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Check if opponent exists
    const opponent = db.prepare('SELECT id FROM users WHERE id = ?').get(opponentId);

    if (!opponent) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const result = db
      .prepare(
        'INSERT INTO challenges (user1Id, user2Id, createdAt) VALUES (?, ?, ?)'
      )
      .run(auth.userId, opponentId, Date.now());

    const challenge = db
      .prepare(
        `
        SELECT
          c.*,
          u1.name as user1Name,
          u2.name as user2Name
        FROM challenges c
        JOIN users u1 ON c.user1Id = u1.id
        JOIN users u2 ON c.user2Id = u2.id
        WHERE c.id = ?
      `
      )
      .get(result.lastInsertRowid);

    return NextResponse.json(challenge);
  } catch (error) {
    console.error('Create challenge error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
