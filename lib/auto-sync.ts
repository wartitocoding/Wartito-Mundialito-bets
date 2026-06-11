import type Database from 'better-sqlite3';
import { syncWithESPN } from './espn-sync';

// Cooldowns distintos: más agresivo cuando hay partidos en vivo
const COOLDOWN_LIVE_MS = 2 * 60 * 1000;   // 2 min si hay partido en vivo
const COOLDOWN_IDLE_MS = 10 * 60 * 1000;  // 10 min si no hay nada activo

let lastSync = 0;
let syncing = false;

/**
 * Dispara un sync con ESPN si:
 *  - hay algún partido con status='live', o
 *  - hay algún partido que terminó hace menos de 2 horas (para capturar el
 *    resultado final aunque ESPN tarde en marcarlo como 'final').
 *
 * Usa cooldowns para no saturar ESPN. Se llama en los endpoints que el
 * dashboard consulta cada 10s (/api/matches, /api/rankings, /api/bets/public).
 */
export async function maybeSyncResults(db: Database.Database): Promise<void> {
  if (syncing) return;

  const now = Date.now();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();

  const hasLive = !!(db.prepare(
    "SELECT 1 FROM matches WHERE status = 'live' LIMIT 1"
  ).get());

  const hasRecentlyFinished = !!(db.prepare(
    "SELECT 1 FROM matches WHERE (status = 'final' OR result1 IS NOT NULL) AND date >= ? LIMIT 1"
  ).get(twoHoursAgo));

  if (!hasLive && !hasRecentlyFinished) return;

  const cooldown = hasLive ? COOLDOWN_LIVE_MS : COOLDOWN_IDLE_MS;
  if (now - lastSync < cooldown) return;

  lastSync = now;
  syncing = true;

  // Fire-and-forget: no esperamos el resultado para no bloquear la response
  syncWithESPN(db)
    .then(r => console.log(`✓ auto-sync: +${r.resultsUpdated} resultados, +${r.pointsRecalculated} puntos`))
    .catch(e => console.error('auto-sync error:', e))
    .finally(() => { syncing = false; });
}
