import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { syncWithESPN } from '@/lib/espn-sync';
import { maybeSyncResults } from '@/lib/auto-sync';

export const dynamic = "force-dynamic";

// Auto-sync: si la DB está vacía la primera vez que alguien entra,
// disparamos un sync con ESPN para poblar los 104 partidos del mundial.
// Se reintenta como máximo cada 5 minutos para evitar abuso.
//
// IMPORTANTE: esto escanea los 39 días del torneo (~39 llamadas a ESPN),
// así que corre en fire-and-forget (sin await). Antes se esperaba (await)
// dentro del GET, y como /api/matches es uno de los 4 endpoints que el
// dashboard sondea cada 10s, cualquier visita mientras la tabla `matches`
// tenía <20 filas (típicamente justo después de un redeploy que borró la
// DB efímera) dejaba la respuesta colgada 10-20+ segundos. El guard
// `autoSyncing` evita que dos requests concurrentes disparen el sync
// completo en paralelo.
let lastAutoSync = 0;
let autoSyncing = false;
const AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

function maybeAutoSync(db: ReturnType<typeof getDatabase>) {
  if (autoSyncing) return;
  const { count } = db.prepare('SELECT COUNT(*) as count FROM matches').get() as { count: number };
  const now = Date.now();
  if (count < 20 && now - lastAutoSync > AUTO_SYNC_COOLDOWN_MS) {
    lastAutoSync = now;
    autoSyncing = true;
    console.log(`Auto-sync ESPN (matches=${count})...`);
    syncWithESPN(db)
      .then(result => console.log(`Auto-sync ok: ${result.inserted} insertados, ${result.updated} actualizados`))
      .catch(e => console.error('Auto-sync ESPN falló:', e))
      .finally(() => { autoSyncing = false; });
  }
}

export async function GET(_: NextRequest) {
  try {
    initDb();
    const db = getDatabase();
    maybeAutoSync(db); // fire-and-forget: puebla fixtures si la DB está vacía
    maybeSyncResults(db); // fire-and-forget: actualiza resultados y puntos si hay partidos activos

    const matches = db.prepare('SELECT * FROM matches ORDER BY date ASC').all();

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Matches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    initDb();
    const db = getDatabase();

    const { team1, team2, stage, date, externalId } = await req.json();

    const result = db
      .prepare(
        'INSERT INTO matches (team1, team2, stage, date, externalId, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(team1, team2, stage, date, externalId, Date.now());

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json(match);
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
