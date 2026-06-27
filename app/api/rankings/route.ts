import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { maybeSyncResults } from '@/lib/auto-sync';
import { ASADO_START_UTC, ASADO_END_UTC, ASADO_BONUS_QUINIELA, ASADO_QUINIELA_MIN } from '@/lib/asado';

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest) {
  try {
    initDb();
    const db = getDatabase();
    maybeSyncResults(db); // fire-and-forget

    const rankings = db
      .prepare(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.championPrediction,
          u.championPoints,
          COUNT(p.id) as totalPredictions,
          SUM(CASE WHEN p.points > 0 THEN 1 ELSE 0 END) as correctPredictions,
          (COALESCE(SUM(p.points), 0) + COALESCE(u.manualPoints, 0)) as matchPoints,
          (COALESCE(SUM(p.points), 0) + COALESCE(u.manualPoints, 0) + COALESCE(u.championPoints, 0)) as totalPoints
        FROM users u
        LEFT JOIN predictions p ON u.id = p.userId
        GROUP BY u.id
        ORDER BY totalPoints DESC, matchPoints DESC, correctPredictions DESC
      `)
      .all() as any[];

    // ── Bono de quiniela del Día del Asado ──────────────────────────────────
    // El/los jugador(es) con 4+ marcadores EXACTOS en los partidos del asado
    // (puntos > 0, que ese día solo viene de marcador exacto) se llevan +3 pts
    // reales en el ranking general. Es aditivo: NO toca apuestas ni puntos
    // guardados, solo suma el bono al total que devuelve este endpoint.
    const asadoHits = db
      .prepare(`
        SELECT p.userId AS userId, COUNT(*) AS n
        FROM predictions p
        JOIN matches m ON p.matchId = m.id
        WHERE p.points > 0 AND m.date >= ? AND m.date < ?
        GROUP BY p.userId
      `)
      .all(ASADO_START_UTC, ASADO_END_UTC) as { userId: number; n: number }[];
    const quinielaBonus: Record<number, number> = {};
    asadoHits.forEach(h => { if (h.n >= ASADO_QUINIELA_MIN) quinielaBonus[h.userId] = ASADO_BONUS_QUINIELA; });

    if (Object.keys(quinielaBonus).length > 0) {
      rankings.forEach(r => {
        const bonus = quinielaBonus[r.id] || 0;
        if (bonus) {
          r.matchPoints = (r.matchPoints || 0) + bonus;
          r.totalPoints = (r.totalPoints || 0) + bonus;
        }
      });
      rankings.sort((a, b) =>
        (b.totalPoints - a.totalPoints) ||
        (b.matchPoints - a.matchPoints) ||
        (b.correctPredictions - a.correctPredictions)
      );
    }

    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Rankings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
