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
    const notifications = db
      .prepare(
        'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50'
      )
      .all(auth.userId);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await req.json();
    const db = getDatabase();

    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?').run(
      notificationId,
      auth.userId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Internal endpoint para crear notificaciones
export async function POST(req: NextRequest) {
  try {
    const { userId, type, title, message } = await req.json();

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    initDb();
    const db = getDatabase();

    const result = db
      .prepare(
        'INSERT INTO notifications (userId, type, title, message, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
      .run(userId, type, title, message, Date.now());

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
