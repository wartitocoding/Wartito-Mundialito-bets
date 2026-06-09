import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    initDb();
    const matchId = parseInt(params.id);
    const db = getDatabase();

    const comments = db
      .prepare(
        `
        SELECT c.*, u.name, u.email
        FROM match_comments c
        JOIN users u ON c.userId = u.id
        WHERE c.matchId = ?
        ORDER BY c.createdAt DESC
      `
      )
      .all(matchId);

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    initDb();
    const auth = verifyAuth(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = parseInt(params.id);
    const { comment } = await req.json();

    if (!comment || comment.length < 1 || comment.length > 500) {
      return NextResponse.json(
        { error: 'Comentario debe tener entre 1 y 500 caracteres' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const result = db
      .prepare(
        'INSERT INTO match_comments (matchId, userId, comment, createdAt) VALUES (?, ?, ?, ?)'
      )
      .run(matchId, auth.userId, comment, Date.now());

    const newComment = db
      .prepare(
        `
        SELECT c.*, u.name, u.email
        FROM match_comments c
        JOIN users u ON c.userId = u.id
        WHERE c.id = ?
      `
      )
      .get(result.lastInsertRowid);

    return NextResponse.json(newComment);
  } catch (error) {
    console.error('Post comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
