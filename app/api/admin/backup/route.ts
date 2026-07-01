/**
 * Export completo de la base de datos, pensado para backup EXTERNO (fuera
 * del disco de Railway). Diseñado para llamarse desde un cron (GitHub
 * Actions / Railway Cron) que guarde la respuesta en un lugar durable.
 *
 * Esta es la ÚNICA copia que protege contra la pérdida del volumen de
 * Railway: los backups locales (lib/backup.ts, npm run backup) viven en el
 * mismo disco que bets.db, así que si /data no es un volumen persistente,
 * se pierden junto con la DB en cada redeploy. Este endpoint saca los datos
 * del disco de Railway por completo.
 *
 * Auth: token en query (?token=...) o header `Authorization: Bearer ...`.
 *
 * Ejemplo (guardar backup diario fuera de Railway):
 *   curl -fsS "https://tu-app.com/api/admin/backup?token=$ADMIN_TOKEN" \
 *     -o "backup-$(date +%F).json"
 *
 * ⚠️ El export incluye los hashes de contraseña (bcrypt) de los usuarios,
 * necesarios para poder restaurar sin forzar un re-registro de todos.
 * Trátalo como un secreto: no lo subas a un repo público ni lo compartas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { runBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const headerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const queryToken = req.nextUrl.searchParams.get('token');
  return headerToken === expected || queryToken === expected;
}

// Todas las tablas del schema (lib/db.ts). Nombres fijos y hardcodeados acá
// (no vienen de input del usuario) — seguro de interpolar en el SQL.
const TABLES = [
  'users', 'matches', 'predictions', 'allowed_users', 'world_cup_config',
  'achievements', 'match_comments', 'notifications', 'challenges',
  'parlays', 'weekly_stats',
] as const;

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    initDb();
    const db = getDatabase();

    // Snapshot binario local además del export (best-effort: si falla, el
    // export JSON de abajo sigue siendo válido y es lo que realmente importa).
    let localSnapshot: string | null = null;
    try {
      localSnapshot = await runBackup();
    } catch (e) {
      console.error('runBackup falló durante /api/admin/backup:', e);
    }

    const tables: Record<string, unknown[]> = {};
    for (const table of TABLES) {
      tables[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }

    const exportedAt = new Date().toISOString();
    return NextResponse.json(
      { ok: true, exportedAt, localSnapshot, tables },
      { headers: { 'Content-Disposition': `attachment; filename="wartito-backup-${exportedAt.slice(0, 10)}.json"` } },
    );
  } catch (error) {
    console.error('Backup export error:', error);
    return NextResponse.json(
      { error: 'backup failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest)  { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
