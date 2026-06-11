import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { syncWithESPN } from '@/lib/espn-sync';

// Auto-sync: si la DB está vacía la primera vez que alguien entra,
// disparamos un sync con ESPN para poblar los 104 partidos del mundial.
// Se reintenta como máximo cada 5 minutos para evitar abuso.
let lastAutoSync = 0;
const AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

async function maybeAutoSync() {
  const db = getDatabase();
  const { count } = db.prepare('SELECT COUNT(*) as count FROM matches').get() as { count: number };
  const now = Date.now();
  if (count < 20 && now - lastAutoSync > AUTO_SYNC_COOLDOWN_MS) {
    lastAutoSync = now;
    try {
      console.log(`Auto-sync ESPN (matches=${count})...`);
      const result = await syncWithESPN(db);
      console.log(`Auto-sync ok: ${result.inserted} insertados, ${result.updated} actualizados`);
    } catch (e) {
      console.error('Auto-sync ESPN falló:', e);
    }
  }
}

export async function GET(_: NextRequest) {
  try {
    initDb();
    await maybeAutoSync();
    const db = getDatabase();

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
