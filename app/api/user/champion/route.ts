import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

/**
 * Permite que el usuario logueado elija/cambie su predicción de campeón.
 * Valida que el equipo sea uno de los que realmente juegan el torneo
 * (derivado de la tabla matches) para que el bonus de campeón calce.
 */
export async function POST(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { championPrediction } = await req.json();
    if (!championPrediction || typeof championPrediction !== 'string') {
      return NextResponse.json({ error: 'championPrediction es requerido' }, { status: 400 });
    }

    const db = getDatabase();

    // Equipos válidos = los que aparecen en algún partido del torneo
    const teams = db.prepare(`
      SELECT DISTINCT team FROM (
        SELECT team1 AS team FROM matches
        UNION
        SELECT team2 AS team FROM matches
      ) ORDER BY team
    `).all() as { team: string }[];
    const validTeams = new Set(teams.map(t => t.team));

    if (!validTeams.has(championPrediction)) {
      return NextResponse.json({ error: 'Equipo no válido' }, { status: 400 });
    }

    db.prepare('UPDATE users SET championPrediction = ? WHERE id = ?')
      .run(championPrediction, auth.userId);

    return NextResponse.json({ ok: true, championPrediction });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('POST /api/user/champion error:', msg);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}
