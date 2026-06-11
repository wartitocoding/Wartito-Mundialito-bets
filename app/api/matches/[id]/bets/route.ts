import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    initDb();
    const auth = verifyAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDatabase();
    const matchId = parseInt(params.id);

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as any;
    if (!match) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });

    // Solo mostrar apuestas si el partido ya empezó o terminó
    const matchDate = new Date(match.date).getTime();
    if (matchDate > Date.now()) {
      return NextResponse.json({ error: 'El partido aún no ha comenzado' }, { status: 403 });
    }

    const bets = db.prepare(`
      SELECT p.betType, p.prediction1, p.prediction2, p.isWildcard, p.points,
             u.name as userName
      FROM predictions p
      JOIN users u ON p.userId = u.id
      WHERE p.matchId = ?
      ORDER BY p.points DESC, u.name ASC
    `).all(matchId) as {
      betType: string;
      prediction1: number;
      prediction2: number;
      isWildcard: number;
      points: number;
      userName: string;
    }[];

    return NextResponse.json({ match, bets });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('GET /api/matches/[id]/bets error:', msg);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}
