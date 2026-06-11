import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

/**
 * Retorna todas las apuestas de partidos que ya empezaron (date <= now o status live/final).
 * Agrupadas por matchId para que el dashboard pueda mostrarlas sin fetch adicional.
 */
export async function GET(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDatabase();
    const now = Date.now();

    const rows = db.prepare(`
      SELECT
        p.matchId,
        p.betType,
        p.prediction1,
        p.prediction2,
        p.isWildcard,
        p.points,
        u.name AS userName
      FROM predictions p
      JOIN users u ON p.userId = u.id
      JOIN matches m ON p.matchId = m.id
      WHERE m.date <= ? OR m.status = 'live' OR m.status = 'final' OR m.result1 IS NOT NULL
      ORDER BY p.matchId, p.points DESC, u.name ASC
    `).all(new Date(now).toISOString()) as {
      matchId: number;
      betType: string;
      prediction1: number;
      prediction2: number;
      isWildcard: number;
      points: number;
      userName: string;
    }[];

    // Agrupar por matchId
    const byMatch: Record<number, typeof rows> = {};
    for (const row of rows) {
      if (!byMatch[row.matchId]) byMatch[row.matchId] = [];
      byMatch[row.matchId].push(row);
    }

    return NextResponse.json(byMatch);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('GET /api/bets/public error:', msg);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}
