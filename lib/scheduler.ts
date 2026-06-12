import { getDatabase, initDb } from './db';
import { syncWithESPN } from './espn-sync';

// Scheduler interno: corre dentro del proceso de Next (Railway no duerme el
// servicio), así los resultados y puntos se actualizan aunque NADIE tenga la
// app abierta. Complementa al auto-sync por request (lib/auto-sync.ts).

const TICK_MS = 3 * 60 * 1000;        // revisa cada 3 minutos
const WC_START = '2026-06-11';
const WC_END = '2026-07-19';

let started = false;
let running = false;

export function startScheduler() {
  if (started) return;
  started = true;
  console.log('⏰ Scheduler de sincronización ESPN iniciado (cada 3 min).');
  setInterval(() => { void tick(); }, TICK_MS);
  setTimeout(() => { void tick(); }, 20_000); // primer chequeo 20s tras arrancar
}

async function tick() {
  if (running) return;

  const today = new Date().toISOString().slice(0, 10);
  if (today < WC_START || today > WC_END) return; // fuera de fechas del torneo

  running = true;
  try {
    initDb();
    const db = getDatabase();

    // Solo gastamos llamadas a ESPN si hay un partido relevante alrededor de
    // ahora: en vivo, o sin resultado dentro de una ventana de ±4 horas.
    const now = Date.now();
    const from = new Date(now - 4 * 60 * 60 * 1000).toISOString();
    const to = new Date(now + 4 * 60 * 60 * 1000).toISOString();
    const worth = db.prepare(`
      SELECT 1 FROM matches
      WHERE status = 'live'
         OR (result1 IS NULL AND date BETWEEN ? AND ?)
      LIMIT 1
    `).get(from, to);

    if (!worth) return; // nada que sincronizar ahora → no molestamos a ESPN

    // Ventana corta (hoy ± 1 día) para ser liviano.
    const oneDay = 24 * 60 * 60 * 1000;
    const startISO = new Date(now - oneDay).toISOString().slice(0, 10);
    const endISO = new Date(now + oneDay).toISOString().slice(0, 10);
    const r = await syncWithESPN(db, { startISO, endISO });
    if (r.resultsUpdated > 0 || r.pointsRecalculated > 0) {
      console.log(`⏰ scheduler: +${r.resultsUpdated} resultados, +${r.pointsRecalculated} puntos`);
    }
  } catch (e) {
    console.error('⏰ scheduler error:', e instanceof Error ? e.message : e);
  } finally {
    running = false;
  }
}
