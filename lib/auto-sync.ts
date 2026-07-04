import type Database from 'better-sqlite3';
import { syncWithESPN } from './espn-sync';

// Cooldowns distintos: más agresivo cuando hay partidos en vivo.
// La ventana de sync es corta (~3 llamadas), así que 45s en vivo es seguro
// y hace que los puntos aparezcan casi apenas termina el partido.
const COOLDOWN_LIVE_MS = 45 * 1000;       // 45s si hay partido en vivo
const COOLDOWN_IDLE_MS = 10 * 60 * 1000;  // 10 min si no hay nada activo
const FIXTURE_REFRESH_MS = 60 * 60 * 1000; // refresco de fixtures cada 1h
const SYNC_STUCK_MS = 5 * 60 * 1000;       // watchdog: un sync no puede durar >5 min

let lastSync = 0;
let lastFixtureSync = 0;
let syncing = false;
let syncStartedAt = 0;

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
  const now = Date.now();

  // Watchdog: si un sync quedó "corriendo" más de 5 min es que se atascó
  // (fetch colgado, promesa nunca resuelta). Se libera el flag para que el
  // sistema se auto-recupere en vez de quedar congelado para siempre.
  if (syncing && now - syncStartedAt > SYNC_STUCK_MS) {
    console.warn('⚠ auto-sync: watchdog liberó un sync atascado');
    syncing = false;
  }
  if (syncing) return;

  // ── (1) Refresco periódico de FIXTURES ────────────────────────────────────
  // Corre aunque NO haya partidos en vivo ni recién terminados: trae los
  // equipos/fechas que se van definiendo (cruces de eliminación a medida que
  // terminan las rondas) y rellena resultados que hayan quedado pendientes.
  // Ventana INTELIGENTE: desde el partido más antiguo sin resultado (menos 1
  // día) hasta el fin del torneo — no escanea los días ya resueltos, así el
  // scan es corto y no gatilla rate-limit de ESPN. Es aditivo: nunca borra
  // partidos ni apuestas.
  if (now - lastFixtureSync >= FIXTURE_REFRESH_MS) {
    lastFixtureSync = now;
    lastSync = now;
    syncing = true;
    syncStartedAt = now;
    const oldestPending = db.prepare(
      'SELECT MIN(date) as d FROM matches WHERE result1 IS NULL'
    ).get() as { d: string | null };
    const startISO = oldestPending?.d
      ? new Date(new Date(oldestPending.d).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    syncWithESPN(db, { startISO }) // endISO por defecto = fin del torneo
      .then(r => console.log(`✓ fixture-sync (${r.daysScanned}d): +${r.inserted} nuevos, ${r.updated} fixtures, ${r.resultsUpdated} resultados, ${r.pointsRecalculated} pts${r.errors.length ? `, ${r.errors.length} errores` : ''}`))
      .catch(e => console.error('fixture-sync error:', e))
      .finally(() => { syncing = false; });
    return;
  }

  // ── (2) Sync de RESULTADOS (ventana corta) cuando hay algo activo ─────────
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
  syncStartedAt = now;

  // Ventana corta: solo hoy ± 1 día (≈3 llamadas a ESPN en vez de 39).
  // Así el sync de resultados es rápido y no satura ESPN aunque corra seguido.
  const oneDay = 24 * 60 * 60 * 1000;
  const startISO = new Date(now - oneDay).toISOString().slice(0, 10);
  const endISO = new Date(now + oneDay).toISOString().slice(0, 10);

  // Fire-and-forget: no esperamos el resultado para no bloquear la response
  syncWithESPN(db, { startISO, endISO })
    .then(r => console.log(`✓ auto-sync: +${r.resultsUpdated} resultados, +${r.pointsRecalculated} puntos`))
    .catch(e => console.error('auto-sync error:', e))
    .finally(() => { syncing = false; });
}
