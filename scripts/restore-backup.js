/**
 * Restaura la base de datos desde un backup — herramienta manual de
 * recuperación ante desastres. NUNCA se expone por HTTP a propósito: esto
 * sobrescribe datos reales y solo debe correrlo un admin, a mano, sabiendo
 * lo que está haciendo.
 *
 * Acepta dos formatos de backup:
 *   - Snapshot binario .db  (de `npm run backup` o de los backups automáticos
 *     del servidor en <dbDir>/backups/) → reemplazo directo del archivo.
 *   - Export .json  (de GET /api/admin/backup) → restaura tabla por tabla.
 *
 * Uso:
 *   node scripts/restore-backup.js <archivo> --yes
 *
 * Sin --yes hace un "dry run": muestra qué haría y no toca nada.
 *
 * Seguridad: SIEMPRE respalda la DB actual (a <dbDir>/backups/pre-restore-*)
 * antes de escribir nada, así que un restore fallido o equivocado se puede
 * deshacer.
 *
 * Para un snapshot .db: DETENÉ el servidor antes de correr esto. Restaurar
 * el archivo mientras el proceso lo tiene abierto (modo WAL) puede dejar la
 * DB inconsistente. Reiniciá el servidor después.
 */

require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const { dbPath } = require('./db-path');

// Mismo listado de tablas que app/api/admin/backup/route.ts. Solo se
// restauran estas — cualquier otra clave en el JSON se ignora (defensa
// contra un archivo de backup corrupto o manipulado).
const KNOWN_TABLES = [
  'users', 'matches', 'predictions', 'allowed_users', 'world_cup_config',
  'achievements', 'match_comments', 'notifications', 'challenges',
  'parlays', 'weekly_stats',
];

function backupsDir() {
  return path.join(path.dirname(dbPath), 'backups');
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/** Copia la DB actual a un lugar seguro antes de tocar nada. */
function safetyBackupCurrentDb() {
  if (!fs.existsSync(dbPath)) {
    console.log('ℹ No hay DB actual en', dbPath, '(nada que respaldar antes del restore).');
    return null;
  }
  const dir = backupsDir();
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `pre-restore-${timestamp()}.db`);
  fs.copyFileSync(dbPath, dest);
  console.log(`✓ DB actual respaldada en: ${dest}`);
  return dest;
}

function restoreFromDbSnapshot(sourcePath, confirmed) {
  const sizeKB = (fs.statSync(sourcePath).size / 1024).toFixed(1);
  console.log(`\nRestaurar snapshot binario:\n  origen: ${sourcePath} (${sizeKB} KB)\n  destino: ${dbPath}\n`);
  if (!confirmed) return;

  safetyBackupCurrentDb();
  fs.copyFileSync(sourcePath, dbPath);
  // Limpia sidecars de WAL viejos para que el próximo open arranque limpio.
  for (const suffix of ['-wal', '-shm']) {
    try { fs.rmSync(dbPath + suffix, { force: true }); } catch {}
  }
  console.log('✅ Snapshot restaurado.');
  console.log('⚠️  Si el servidor estaba corriendo, REINICIALO ahora para que tome el archivo restaurado.');
}

function restoreFromJsonExport(sourcePath, confirmed) {
  const parsed = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const tables = parsed.tables || {};
  const summary = KNOWN_TABLES.map(t => `  ${t}: ${(tables[t] || []).length} filas`).join('\n');
  console.log(`\nRestaurar export JSON (exportado: ${parsed.exportedAt || 'desconocido'}):\n  destino: ${dbPath}\n${summary}\n`);
  if (!confirmed) return;

  safetyBackupCurrentDb();
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ No existe ${dbPath} — corré "npm run init-db" primero para crear el schema.`);
    process.exit(1);
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const restoreAll = db.transaction(() => {
    for (const table of KNOWN_TABLES) {
      const rows = tables[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const validCols = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name));
      const cols = Object.keys(rows[0]).filter(c => validCols.has(c));
      if (cols.length === 0) continue;

      db.prepare(`DELETE FROM ${table}`).run();
      const placeholders = cols.map(() => '?').join(', ');
      const insert = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);
      for (const row of rows) insert.run(cols.map(c => row[c]));
    }
  });

  restoreAll();
  db.close();
  console.log('✅ Datos restaurados desde el export JSON.');
}

function main() {
  const args = process.argv.slice(2);
  const sourcePath = args.find(a => !a.startsWith('--'));
  const confirmed = args.includes('--yes');

  if (!sourcePath) {
    console.error('Uso: node scripts/restore-backup.js <archivo.db|archivo.json> [--yes]');
    process.exit(1);
  }
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ No existe el archivo: ${sourcePath}`);
    process.exit(1);
  }
  if (!confirmed) {
    console.log('🔍 DRY RUN (no se modifica nada). Agregá --yes para ejecutar de verdad.\n');
  }

  if (sourcePath.endsWith('.db')) {
    restoreFromDbSnapshot(sourcePath, confirmed);
  } else if (sourcePath.endsWith('.json')) {
    restoreFromJsonExport(sourcePath, confirmed);
  } else {
    console.error('❌ Formato no reconocido. Debe terminar en .db o .json');
    process.exit(1);
  }

  if (!confirmed) {
    console.log('\nCuando estés seguro, volvé a correr agregando --yes al final.');
  }
}

main();
