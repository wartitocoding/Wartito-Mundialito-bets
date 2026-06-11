import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const adminToken = process.env.ADMIN_TOKEN || 'admin-secret';

    if (token !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    initDb();
    const db = getDatabase();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const matchId = searchParams.get('matchId');

    let query = `
      SELECT
        p.*,
        u.name as userName,
        u.email,
        m.team1,
        m.team2,
        m.result1,
        m.result2
      FROM predictions p
      JOIN users u ON p.userId = u.id
      JOIN matches m ON p.matchId = m.id
    `;

    const params: any[] = [];

    if (userId) {
      query += ' WHERE p.userId = ?';
      params.push(userId);
    }

    if (matchId) {
      query += userId ? ' AND' : ' WHERE';
      query += ' p.matchId = ?';
      params.push(matchId);
    }

    query += ' ORDER BY p.createdAt DESC LIMIT 100';

    const predictions = db.prepare(query).all(...params);

    return NextResponse.json(predictions);
  } catch (error) {
    console.error('Get admin predictions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const adminToken = process.env.ADMIN_TOKEN || 'admin-secret';

    if (token !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { predictionId, prediction1, prediction2, points } = await req.json();

    if (!predictionId) {
      return NextResponse.json(
        { error: 'predictionId is required' },
        { status: 400 }
      );
    }

    initDb();
    const db = getDatabase();

    const updates: string[] = [];
    const values: any[] = [];

    if (prediction1 !== undefined) {
      updates.push('prediction1 = ?');
      values.push(prediction1);
    }

    if (prediction2 !== undefined) {
      updates.push('prediction2 = ?');
      values.push(prediction2);
    }

    if (points !== undefined) {
      updates.push('points = ?');
      values.push(points);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(predictionId);

    db.prepare(`UPDATE predictions SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update prediction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const adminToken = process.env.ADMIN_TOKEN || 'admin-secret';

    if (token !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { predictionId } = await req.json();

    if (!predictionId) {
      return NextResponse.json(
        { error: 'predictionId is required' },
        { status: 400 }
      );
    }

    initDb();
    const db = getDatabase();

    db.prepare('DELETE FROM predictions WHERE id = ?').run(predictionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete prediction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
