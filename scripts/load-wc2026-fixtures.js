/**
 * Carga el fixture oficial del Mundial 2026 — Fase de Grupos completa (11–27 junio).
 *
 * Horarios: capturados desde ESPN en ET (EDT, UTC-4).
 * En junio 2026, Chile está en CLT (UTC-4) — coincide exactamente con ET.
 * Almacenamos en UTC (ET + 4h) para que `new Date(match.date)` muestre
 * correctamente la hora chilena en cualquier cliente.
 *
 * Uso: node scripts/load-wc2026-fixtures.js
 */

require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');

const { dbPath } = require('./db-path');
const db = new Database(dbPath);

// [día-junio, hora-ET (24h), minutos, grupo, team1, team2, ciudad]
const FIXTURES = [
  // ── Jornada 1 ─────────────────────────────
  [11, 15, 0, 'A', 'México', 'Sudáfrica', 'Ciudad de México'],
  [11, 22, 0, 'A', 'Corea del Sur', 'Chequia', 'Zapopan'],
  [12, 15, 0, 'B', 'Canadá', 'Bosnia y Herzegovina', 'Toronto'],
  [12, 21, 0, 'D', 'Estados Unidos', 'Paraguay', 'Inglewood'],
  [13, 15, 0, 'B', 'Catar', 'Suiza', 'Santa Clara'],
  [13, 18, 0, 'C', 'Brasil', 'Marruecos', 'East Rutherford'],
  [13, 21, 0, 'C', 'Haití', 'Escocia', 'Foxborough'],
  [14, 0, 0, 'D', 'Australia', 'Turquía', 'Vancouver'],
  [14, 13, 0, 'E', 'Alemania', 'Curazao', 'Houston'],
  [14, 16, 0, 'F', 'Países Bajos', 'Japón', 'Arlington'],
  [14, 19, 0, 'E', 'Costa de Marfil', 'Ecuador', 'Filadelfia'],
  [14, 22, 0, 'F', 'Suecia', 'Túnez', 'Guadalupe'],
  [15, 13, 0, 'H', 'España', 'Cabo Verde', 'Atlanta'],
  [15, 18, 0, 'G', 'Bélgica', 'Egipto', 'Seattle'],
  [15, 18, 0, 'H', 'Arabia Saudita', 'Uruguay', 'Miami Gardens'],
  [16, 0, 0, 'G', 'Irán', 'Nueva Zelanda', 'Inglewood'],
  [16, 15, 0, 'I', 'Francia', 'Senegal', 'East Rutherford'],
  [16, 18, 0, 'I', 'Irak', 'Noruega', 'Foxborough'],
  [16, 21, 0, 'J', 'Argentina', 'Argelia', 'Kansas City'],
  [17, 0, 0, 'J', 'Austria', 'Jordania', 'Santa Clara'],
  [17, 13, 0, 'K', 'Portugal', 'RD Congo', 'Houston'],
  [17, 16, 0, 'L', 'Inglaterra', 'Croacia', 'Arlington'],
  [17, 19, 0, 'L', 'Ghana', 'Panamá', 'Toronto'],
  [17, 22, 0, 'K', 'Uzbekistán', 'Colombia', 'Ciudad de México'],

  // ── Jornada 2 ─────────────────────────────
  [18, 12, 0, 'A', 'Chequia', 'Sudáfrica', 'Atlanta'],
  [18, 15, 0, 'B', 'Suiza', 'Bosnia y Herzegovina', 'Inglewood'],
  [18, 18, 0, 'B', 'Canadá', 'Catar', 'Vancouver'],
  [18, 23, 0, 'A', 'México', 'Corea del Sur', 'Zapopan'],
  [19, 15, 0, 'D', 'Estados Unidos', 'Australia', 'Seattle'],
  [19, 18, 0, 'C', 'Escocia', 'Marruecos', 'Foxborough'],
  [19, 21, 0, 'C', 'Brasil', 'Haití', 'Filadelfia'],
  [20, 0, 0, 'D', 'Turquía', 'Paraguay', 'Santa Clara'],
  [20, 13, 0, 'F', 'Países Bajos', 'Suecia', 'Houston'],
  [20, 16, 0, 'E', 'Alemania', 'Costa de Marfil', 'Toronto'],
  [20, 20, 0, 'E', 'Ecuador', 'Curazao', 'Kansas City'],
  [21, 0, 0, 'F', 'Túnez', 'Japón', 'Guadalupe'],
  [21, 12, 0, 'H', 'España', 'Arabia Saudita', 'Atlanta'],
  [21, 15, 0, 'G', 'Bélgica', 'Irán', 'Inglewood'],
  [21, 18, 0, 'H', 'Uruguay', 'Cabo Verde', 'Miami Gardens'],
  [21, 21, 0, 'G', 'Nueva Zelanda', 'Egipto', 'Vancouver'],
  [22, 13, 0, 'J', 'Argentina', 'Austria', 'Arlington'],
  [22, 17, 0, 'I', 'Francia', 'Irak', 'Filadelfia'],
  [22, 20, 0, 'I', 'Noruega', 'Senegal', 'East Rutherford'],
  [22, 23, 0, 'J', 'Jordania', 'Argelia', 'Santa Clara'],
  [23, 13, 0, 'K', 'Portugal', 'Uzbekistán', 'Houston'],
  [23, 16, 0, 'L', 'Inglaterra', 'Ghana', 'Foxborough'],
  [23, 19, 0, 'L', 'Panamá', 'Croacia', 'Toronto'],
  [23, 22, 0, 'K', 'Colombia', 'RD Congo', 'Zapopan'],

  // ── Jornada 3 (simultáneas) ───────────────
  [24, 15, 0, 'B', 'Suiza', 'Canadá', 'Vancouver'],
  [24, 15, 0, 'B', 'Bosnia y Herzegovina', 'Catar', 'Seattle'],
  [24, 18, 0, 'C', 'Escocia', 'Brasil', 'Miami Gardens'],
  [24, 18, 0, 'C', 'Marruecos', 'Haití', 'Atlanta'],
  [24, 21, 0, 'A', 'Chequia', 'México', 'Ciudad de México'],
  [24, 21, 0, 'A', 'Sudáfrica', 'Corea del Sur', 'Guadalupe'],
  [25, 16, 0, 'E', 'Ecuador', 'Alemania', 'East Rutherford'],
  [25, 16, 0, 'E', 'Curazao', 'Costa de Marfil', 'Filadelfia'],
  [25, 19, 0, 'F', 'Japón', 'Suecia', 'Arlington'],
  [25, 19, 0, 'F', 'Túnez', 'Países Bajos', 'Kansas City'],
  [25, 22, 0, 'D', 'Turquía', 'Estados Unidos', 'Inglewood'],
  [25, 22, 0, 'D', 'Paraguay', 'Australia', 'Santa Clara'],
  [26, 15, 0, 'I', 'Noruega', 'Francia', 'Foxborough'],
  [26, 15, 0, 'I', 'Senegal', 'Irak', 'Toronto'],
  [26, 20, 0, 'H', 'Cabo Verde', 'Arabia Saudita', 'Houston'],
  [26, 20, 0, 'H', 'Uruguay', 'España', 'Zapopan'],
  [26, 23, 0, 'G', 'Egipto', 'Irán', 'Seattle'],
  [26, 23, 0, 'G', 'Nueva Zelanda', 'Bélgica', 'Vancouver'],
  [27, 17, 0, 'L', 'Panamá', 'Inglaterra', 'East Rutherford'],
  [27, 17, 0, 'L', 'Croacia', 'Ghana', 'Filadelfia'],
  [27, 19, 30, 'K', 'Colombia', 'Portugal', 'Miami Gardens'],
  [27, 19, 30, 'K', 'RD Congo', 'Uzbekistán', 'Atlanta'],
  [27, 22, 0, 'J', 'Argelia', 'Austria', 'Kansas City'],
  [27, 22, 0, 'J', 'Jordania', 'Argentina', 'Arlington'],
];

/**
 * Convierte (día, hora, min) ET → ISO UTC.
 * ET en junio = EDT (UTC-4), por tanto UTC = ET + 4h.
 */
function toUTCISO(day, hourET, minET) {
  // Date.UTC interpreta los argumentos como UTC; sumamos 4h al hourET.
  const ms = Date.UTC(2026, 5, day, hourET + 4, minET, 0);
  return new Date(ms).toISOString();
}

console.log('🌎 Cargando fixture Mundial 2026 — Fase de grupos (11–27 junio)\n');

// Limpiar partidos existentes que NO tengan apuestas asociadas
const existingMatches = db.prepare('SELECT id FROM matches').all();
let cleared = 0;
for (const m of existingMatches) {
  const hasPredictions = db
    .prepare('SELECT COUNT(*) as c FROM predictions WHERE matchId = ?')
    .get(m.id);
  if (hasPredictions.c === 0) {
    db.prepare('DELETE FROM matches WHERE id = ?').run(m.id);
    cleared++;
  }
}
if (cleared > 0) console.log(`🗑  ${cleared} partidos previos sin apuestas eliminados\n`);

const insertStmt = db.prepare(`
  INSERT INTO matches (externalId, team1, team2, stage, date, status, createdAt)
  VALUES (?, ?, ?, ?, ?, 'scheduled', ?)
  ON CONFLICT(externalId) DO UPDATE SET
    team1 = excluded.team1,
    team2 = excluded.team2,
    stage = excluded.stage,
    date = excluded.date
`);

let inserted = 0;
let updated = 0;

for (const [day, hourET, minET, group, team1, team2, city] of FIXTURES) {
  const dateUTC = toUTCISO(day, hourET, minET);
  const stage = `Grupo ${group}`;
  // externalId estable basado en fecha + equipos para evitar duplicados al re-correr
  const externalId = `wc2026-${day}-${hourET}${minET}-${group}-${team1.substring(0, 3)}${team2.substring(0, 3)}`
    .replace(/\s+/g, '');

  const existing = db.prepare('SELECT id FROM matches WHERE externalId = ?').get(externalId);
  insertStmt.run(externalId, team1, team2, stage, dateUTC, Date.now());
  if (existing) updated++;
  else inserted++;

  // Mostrar en hora chilena (UTC-4 en junio = mismo offset que ET)
  const chileTime = new Date(dateUTC).toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  console.log(`  ✓ [${stage}] ${chileTime} CL — ${team1} vs ${team2} (${city})`);
}

console.log(`\n✅ ${inserted} partidos nuevos, ${updated} actualizados (total ${FIXTURES.length})`);
console.log('📍 Todas las fechas almacenadas en UTC. El cliente las muestra en hora local.');

db.close();
