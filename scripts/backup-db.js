/**
 * Crea un snapshot manual de la base de datos (uso: npm run backup).
 *
 * Útil antes de correr una migración, un update-results, o simplemente para
 * tener una copia a mano. El servidor ya corre esto automáticamente cada
 * 10 min (ver lib/backup.ts) — este script es para disparar uno on-demand.
 *
 * Abre la DB en modo readonly: solo lee para el snapshot, nunca escribe en
 * el archivo real, así que es seguro correrlo con el servidor prendido.
 */

require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const { dbPath } = require('./db-path');

const MAX_LOCAL_BACKUPS = 144;
const FILE_PREFIX = 'bets-';
const FILE_SUFFIX = '.db';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function rotateBackups(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(FILE_PREFIX) && f.endsWith(FILE_SUFFIX))
    .sort();
  const excess = files.length - MAX_LOCAL_BACKUPS;
  if (excess <= 0) return;
  for (const f of files.slice(0, excess)) {
    try { fs.unlinkSync(path.join(dir, f)); } catch {}
  }
}

async function main() {
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ No existe DB en ${dbPath} — nada que respaldar.`);
    process.exit(1);
  }

  const db = new Database(dbPath, { readonly: true });
  const dir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${FILE_PREFIX}${timestamp()}${FILE_SUFFIX}`);

  console.log(`💾 Respaldando ${dbPath} → ${dest}`);
  await db.backup(dest);
  db.close();

  rotateBackups(dir);
  console.log(`✅ Backup creado: ${dest}`);
}

main().catch(err => {
  console.error('❌ Error creando backup:', err.message);
  process.exit(1);
});
