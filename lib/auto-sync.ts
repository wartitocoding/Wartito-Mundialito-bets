import type Database from 'better-sqlite3';
import { syncWithESPN } from './espn-sync';

// Cooldowns distintos: más agresivo cuando hay partidos en vivo.
// La ventana de sync es corta (~3 llamadas), así que 45s en vivo es seguro
// y hace que los puntos aparezcan casi apenas termina el partido.
const COOLDOWN_LIVE_MS = 45 * 1000;       // 45s si hay partido en vivo
const COOLDOWN_IDLE_MS = 10 * 60 * 1000;  // 10 min si no hay nada activo
const FIXTURE_REFRESH_MS = 3 * 60 * 60 * 1000; // refresco de fixtures completos cada 3h

let lastSync = 0;
let lastFixtureSync = 0;
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

  // ── (1) Refresco periódico de FIXTURES completos ──────────────────────────
  // Corre aunque NO haya partidos en vivo ni recién terminados: trae los
  // equipos/fechas que se van definiendo (cruces de eliminación a medida que
  // terminan las rondas: 16avos, octavos, cuartos…). Cooldown largo (3h) y
  // escanea todo el torneo. Es aditivo: nunca borra partidos ni apuestas, solo
  // actualiza fixtures y recalcula puntos de partidos ya finalizados.
  if (now - lastFixtureSync >= FIXTURE_REFRESH_MS) {
    lastFixtureSync = now;
    lastSync = now;
    syncing = true;
    syncWithESPN(db)
      .then(r => console.log(`✓ fixture-sync: +${r.inserted} nuevos, ${r.updated} fixtures, ${r.resultsUpdated} resultados`))
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
