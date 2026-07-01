/**
 * Backups locales automáticos de la base de datos.
 *
 * Usa la API nativa de backup de SQLite (db.backup(destino)), que es segura
 * de correr con la DB abierta y en uso, incluso en modo WAL — no bloquea ni
 * corrompe escrituras concurrentes.
 *
 * OJO — esto protege contra corrupción, un bug de escritura, o un update-results
 * que dejó puntos mal calculados: siempre se puede volver a un snapshot de
 * hace unos minutos. NO protege contra la pérdida del volumen de Railway: si
 * `/data` no es un volumen persistente, un redeploy borra bets.db Y esta
 * carpeta de backups por igual (viven en el mismo disco). Para eso existe el
 * export externo de /api/admin/backup (ver CLAUDE.md) — la única copia que
 * sale del disco de Railway.
 */

import fs from 'fs';
import path from 'path';
import { getDatabase, initDb, dbPath } from './db';

const BACKUP_INTERVAL_MS = 10 * 60 * 1000; // cada 10 min
const MAX_LOCAL_BACKUPS = 144;             // ≈24h de historial a 10 min de cadencia
const FILE_PREFIX = 'bets-';
const FILE_SUFFIX = '.db';

export function backupsDir(): string {
  return path.join(path.dirname(dbPath), 'backups');
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/** Crea un snapshot binario completo y rota los backups viejos. Devuelve la ruta creada. */
export async function runBackup(): Promise<string> {
  initDb();
  const db = getDatabase();

  const dir = backupsDir();
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${FILE_PREFIX}${timestamp()}${FILE_SUFFIX}`);

  await db.backup(dest);
  rotateBackups(dir);
  return dest;
}

function rotateBackups(dir: string) {
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(FILE_PREFIX) && f.endsWith(FILE_SUFFIX))
    .sort(); // los timestamps ISO ordenan lexicográficamente = orden cronológico

  const excess = files.length - MAX_LOCAL_BACKUPS;
  if (excess <= 0) return;
  for (const f of files.slice(0, excess)) {
    try { fs.unlinkSync(path.join(dir, f)); } catch { /* ya no está, no importa */ }
  }
}

/** Lista los backups locales disponibles, más reciente primero. */
export function listBackups(): { file: string; sizeBytes: number; createdAt: string }[] {
  const dir = backupsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.startsWith(FILE_PREFIX) && f.endsWith(FILE_SUFFIX))
    .sort()
    .reverse()
    .map(f => {
      const st = fs.statSync(path.join(dir, f));
      return { file: f, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
    });
}

let started = false;

/** Arranca el scheduler de backups locales (una vez por proceso). */
export function startBackupScheduler() {
  if (started) return;
  started = true;
  console.log(`💾 Scheduler de backups locales iniciado (cada ${BACKUP_INTERVAL_MS / 60000} min, retiene ${MAX_LOCAL_BACKUPS}).`);

  const tick = () => {
    runBackup()
      .then(dest => console.log(`✓ Backup local: ${dest}`))
      .catch(e => console.error('⚠ Backup local falló:', e instanceof Error ? e.message : e));
  };

  setInterval(() => { void tick(); }, BACKUP_INTERVAL_MS);
  setTimeout(() => { void tick(); }, 30_000); // primer backup 30s tras arrancar
}
