/**
 * Sincronización con la API pública de ESPN para el Mundial 2026.
 *
 * Endpoint: https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
 *
 * - Sin autenticación.
 * - Devuelve los partidos del día con marcador en vivo (si corresponde).
 * - Las fechas vienen en ISO UTC (formato "2026-06-11T19:00Z").
 *
 * Se recorre todo el rango del torneo (11 junio – 19 julio 2026) y se
 * inserta / actualiza cada partido, calculando puntos cuando un partido finaliza.
 */

import Database from 'better-sqlite3';
import { translateTeam, deduceStage } from './wc2026-data';
import { calculatePoints, type BetType } from './scoring';

const ESPN_URL = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  score: string;
  winner?: boolean;        // ESPN marca true al equipo que avanza (incluye alargue/penales)
  shootoutScore?: number;  // marcador de la tanda de penales (solo si hubo)
  team: { displayName: string };
}
interface ESPNEvent {
  id: string;
  date: string;
  status: { type: { completed: boolean; state: string } };
  competitions: Array<{
    status: { type: { completed: boolean; state: string } };
    competitors: ESPNCompetitor[];
  }>;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Nombre "placeholder" de un cruce aún no resuelto (misma convención que el
// dashboard): "1° Grupo A", "Ganador R32 #4", "3° C/D/F/G/H", etc.
const PLACEHOLDER_TEAM_RE = /grupo|ganador|perdedor|definir|winner|loser|[°/]/i;
function isPlaceholderTeam(name: string | null | undefined): boolean {
  return !name || PLACEHOLDER_TEAM_RE.test(name);
}

// Fetch robusto: timeout de 10s por request + 2 reintentos con backoff.
// Sin esto, un fetch colgado o un 429 de ESPN dejaba el sync atascado y los
// fixtures/resultados quedaban congelados (visto 29-jun→2-jul).
async function fetchDay(yyyymmdd: string, retries = 2): Promise<ESPNEvent[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${ESPN_URL}?dates=${yyyymmdd}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 429 && attempt < retries) {
        await sleep(1500 * (attempt + 1)); // rate-limit: esperar y reintentar
        continue;
      }
      if (!res.ok) throw new Error(`ESPN ${res.status} for ${yyyymmdd}`);
      const data = await res.json();
      return data.events || [];
    } catch (e) {
      if (attempt >= retries) throw e;
      await sleep(800 * (attempt + 1));
    }
  }
}

function dateRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO);
  const end = new Date(endISO);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    out.push(`${y}${m}${day}`);
  }
  return out;
}

export interface SyncResult {
  daysScanned: number;
  inserted: number;
  updated: number;
  resultsUpdated: number;
  pointsRecalculated: number;
  errors: string[];
}

/** Límites del torneo. Por defecto se escanea todo; el auto-sync de
 *  resultados pasa una ventana corta (hoy ± 1 día) para ser rápido y liviano. */
const WC_START = '2026-06-11';
const WC_END = '2026-07-19';

export async function syncWithESPN(
  db: Database.Database,
  opts?: { startISO?: string; endISO?: string },
): Promise<SyncResult> {
  const result: SyncResult = {
    daysScanned: 0, inserted: 0, updated: 0,
    resultsUpdated: 0, pointsRecalculated: 0, errors: [],
  };

  // Acota el rango a los límites del torneo (evita escanear días inválidos).
  const start = (opts?.startISO && opts.startISO > WC_START) ? opts.startISO : WC_START;
  const end = (opts?.endISO && opts.endISO < WC_END) ? opts.endISO : WC_END;
  const days = dateRange(start, end);
  const allEvents: ESPNEvent[] = [];

  for (const day of days) {
    try {
      const events = await fetchDay(day);
      allEvents.push(...events);
      result.daysScanned++;
      await sleep(250); // pausa entre días para no gatillar rate-limit de ESPN
    } catch (e) {
      result.errors.push(`${day}: ${(e as Error).message}`);
    }
  }

  const upsertNew = db.prepare(`
    INSERT INTO matches (externalId, team1, team2, stage, date, result1, result2, liveScore1, liveScore2, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateFixture = db.prepare(`
    UPDATE matches SET team1 = ?, team2 = ?, stage = ?, date = ? WHERE externalId = ?
  `);
  const updateResult = db.prepare(`
    UPDATE matches SET result1 = ?, result2 = ?, liveScore1 = ?, liveScore2 = ?, status = ? WHERE externalId = ?
  `);

  for (const ev of allEvents) {
    try {
      const comp = ev.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === 'home');
      const away = comp.competitors.find(c => c.homeAway === 'away');
      if (!home || !away) continue;

      const team1 = translateTeam(home.team.displayName);
      const team2 = translateTeam(away.team.displayName);
      const dateUTC = new Date(ev.date).toISOString();
      const stage = deduceStage(new Date(ev.date), team1, team2);
      const completed = comp.status.type.completed;
      const state = comp.status.type.state;
      const result1 = completed ? parseInt(home.score, 10) : null;
      const result2 = completed ? parseInt(away.score, 10) : null;
      // Ganador del cruce = quien AVANZA, incluyendo 90'+alargue+penales.
      // 1° el flag `winner` de ESPN (confiable, true al que pasa, también por
      // penales); 2° si no viniera, se decide por el marcador de penales
      // (shootoutScore); si tampoco hay, queda null y el scoring usa el marcador.
      const homeShoot = typeof home.shootoutScore === 'number' ? home.shootoutScore : null;
      const awayShoot = typeof away.shootoutScore === 'number' ? away.shootoutScore : null;
      const winnerSide: 'team1' | 'team2' | null = !completed ? null
        : home.winner ? 'team1'
        : away.winner ? 'team2'
        : (homeShoot != null && awayShoot != null && homeShoot !== awayShoot)
          ? (homeShoot > awayShoot ? 'team1' : 'team2')
          : null;
      // Marcador "en vivo": el score actual que reporta ESPN aunque el partido
      // no haya terminado. Se guarda aparte para no confundir "partido finalizado"
      // (que se sigue detectando por result1/result2 != null).
      const live1 = home.score != null && home.score !== '' ? parseInt(home.score, 10) : null;
      const live2 = away.score != null && away.score !== '' ? parseInt(away.score, 10) : null;
      const status =
        completed ? 'finished'
        : state === 'in' ? 'live'
        : 'scheduled';

      const existing = db.prepare('SELECT * FROM matches WHERE externalId = ?').get(ev.id) as any;

      if (!existing) {
        upsertNew.run(ev.id, team1, team2, stage, dateUTC, result1, result2, live1, live2, status, Date.now());
        result.inserted++;
        if (completed) {
          recalcPointsFor(db, ev.id, result1!, result2!, winnerSide);
          result.pointsRecalculated++;
        }
      } else {
        // Un nombre real NUNCA se pisa con un placeholder: ESPN a ratos devuelve
        // los cruces como "Round of 32 4 Winner" aunque ya estaban resueltos
        // (glitch transitorio) y eso hacía retroceder "Brasil vs Noruega" a
        // "Ganador R32 #4", ocultando el partido de las vistas de apuesta.
        // Real→real y placeholder→real siguen permitidos.
        const keep1 = isPlaceholderTeam(team1) && !isPlaceholderTeam(existing.team1);
        const keep2 = isPlaceholderTeam(team2) && !isPlaceholderTeam(existing.team2);
        const newTeam1 = keep1 ? existing.team1 : team1;
        const newTeam2 = keep2 ? existing.team2 : team2;
        const fixtureChanged =
          existing.team1 !== newTeam1 ||
          existing.team2 !== newTeam2 ||
          existing.stage !== stage ||
          existing.date !== dateUTC;
        if (fixtureChanged) {
          updateFixture.run(newTeam1, newTeam2, stage, dateUTC, ev.id);
          result.updated++;
        }
        const resultChanged =
          existing.result1 !== result1 ||
          existing.result2 !== result2 ||
          existing.liveScore1 !== live1 ||
          existing.liveScore2 !== live2 ||
          existing.status !== status;
        if (resultChanged) {
          updateResult.run(result1, result2, live1, live2, status, ev.id);
          if (completed) {
            recalcPointsFor(db, ev.id, result1!, result2!, winnerSide);
            result.pointsRecalculated++;
          }
          result.resultsUpdated++;
        }
      }
    } catch (e) {
      result.errors.push(`evento ${ev.id}: ${(e as Error).message}`);
    }
  }

  return result;
}

/**
 * Recalcula los puntos de todas las apuestas de un partido finalizado.
 * Usa la única fuente de verdad de scoring: lib/scoring.ts (calculatePoints)
 *  - 3 pts marcador exacto · 2 pts empate · 1 pt ganador · x2 con comodín
 */
function recalcPointsFor(
  db: Database.Database,
  externalId: string,
  g1: number,
  g2: number,
  winner: 'team1' | 'team2' | null = null,
) {
  const match = db.prepare('SELECT id FROM matches WHERE externalId = ?').get(externalId) as any;
  if (!match) return;
  const preds = db
    .prepare('SELECT * FROM predictions WHERE matchId = ?')
    .all(match.id) as any[];

  for (const p of preds) {
    const points = calculatePoints(
      { betType: (p.betType || 'exact') as BetType, prediction1: p.prediction1, prediction2: p.prediction2, isWildcard: p.isWildcard },
      g1, g2, winner,
    );
    db.prepare('UPDATE predictions SET points = ? WHERE id = ?').run(points, p.id);
  }
}
