import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

export const dynamic = "force-dynamic";

function getPhase(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes('group') || s.includes('grupo')) return 'grupos';
  if (s.includes('quarter') || s.includes('cuarto')) return 'cuartos';
  if (s.includes('semi') || s.includes('tercer') || s.includes('3rd') || s.includes('third')) return 'semis';
  if (s.includes('16') || s.includes('octavo') || s.includes('round of 16')) return 'octavos';
  if (s.includes('final')) return 'final';
  return s.replace(/\s+/g, '_');
}

function phaseName(phase: string): string {
  const names: Record<string, string> = {
    grupos: 'la fase de grupos',
    octavos: 'los octavos de final',
    cuartos: 'los cuartos de final',
    semis: 'las semifinales',
    final: 'la final',
  };
  return names[phase] || phase;
}

export async function GET(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDatabase();
    const predictions = db
      .prepare('SELECT * FROM predictions WHERE userId = ? ORDER BY createdAt DESC')
      .all(auth.userId);

    return NextResponse.json(predictions);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ GET /api/predictions FAILED:', {
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error', details: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      matchId,
      prediction1: rawP1,
      prediction2: rawP2,
      isWildcard = false,
      betType = 'exact',
    } = await req.json();

    const validTypes = ['exact', 'draw', 'team1', 'team2'];
    if (!validTypes.includes(betType)) {
      return NextResponse.json({ error: 'betType inválido' }, { status: 400 });
    }

    // Para apuestas no-exactas guardamos placeholders coherentes.
    // Lo que realmente cuenta para el scoring es betType.
    let prediction1: number, prediction2: number;
    if (betType === 'exact') {
      if (typeof rawP1 !== 'number' || typeof rawP2 !== 'number') {
        return NextResponse.json({ error: 'prediction1 y prediction2 deben ser números' }, { status: 400 });
      }
      if (rawP1 < 0 || rawP2 < 0 || rawP1 > 20 || rawP2 > 20) {
        return NextResponse.json({ error: 'Marcador fuera de rango (0–20)' }, { status: 400 });
      }
      prediction1 = Math.floor(rawP1);
      prediction2 = Math.floor(rawP2);
    } else if (betType === 'draw') {
      prediction1 = 1; prediction2 = 1;
    } else if (betType === 'team1') {
      prediction1 = 1; prediction2 = 0;
    } else {
      prediction1 = 0; prediction2 = 1;
    }

    const db = getDatabase();
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as any;
    if (!match) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });

    if (new Date(match.date).getTime() < Date.now()) {
      return NextResponse.json({ error: 'No puedes apostar en partidos que ya comenzaron' }, { status: 400 });
    }

    const existing = db
      .prepare('SELECT * FROM predictions WHERE userId = ? AND matchId = ?')
      .get(auth.userId, matchId) as any;

    // Wildcard validation: only 1 per phase, excluding current match
    if (isWildcard) {
      const phase = getPhase(match.stage);
      const otherWildcards = db.prepare(`
        SELECT m.stage FROM predictions p
        JOIN matches m ON p.matchId = m.id
        WHERE p.userId = ? AND p.isWildcard = 1 AND p.matchId != ?
      `).all(auth.userId, matchId) as { stage: string }[];

      const phaseAlreadyUsed = otherWildcards.some(w => getPhase(w.stage) === phase);
      if (phaseAlreadyUsed) {
        return NextResponse.json(
          { error: `Ya usaste el comodín en ${phaseName(phase)}. Solo puedes usar uno por fase.` },
          { status: 400 }
        );
      }
    }

    if (existing) {
      db.prepare('UPDATE predictions SET prediction1 = ?, prediction2 = ?, isWildcard = ?, betType = ? WHERE id = ?')
        .run(prediction1, prediction2, isWildcard ? 1 : 0, betType, existing.id);
      const updated = db.prepare('SELECT * FROM predictions WHERE id = ?').get(existing.id);
      return NextResponse.json(updated);
    }

    const result = db
      .prepare('INSERT INTO predictions (userId, matchId, prediction1, prediction2, isWildcard, betType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(auth.userId, matchId, prediction1, prediction2, isWildcard ? 1 : 0, betType, Date.now());

    const prediction = db.prepare('SELECT * FROM predictions WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(prediction);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ POST /api/predictions FAILED:', {
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error', details: errorMsg },
      { status: 500 }
    );
  }
}
