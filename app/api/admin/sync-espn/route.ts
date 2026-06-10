/**
 * Sincroniza fixtures + resultados desde la API pública de ESPN.
 * No requiere clave externa.
 *
 * Auth: token en query (?token=...) o header `Authorization: Bearer ...`.
 * Diseñado para llamarse desde un cron (Railway, Vercel Cron, GitHub Actions).
 *
 * Ejemplos:
 *   curl -X POST https://tu-app.com/api/admin/sync-espn -H "Authorization: Bearer $ADMIN_TOKEN"
 *   curl "https://tu-app.com/api/admin/sync-espn?token=$ADMIN_TOKEN"
 */

import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';
import { syncWithESPN } from '@/lib/espn-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const headerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const queryToken = req.nextUrl.searchParams.get('token');
  return headerToken === expected || queryToken === expected;
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    initDb();
    const db = getDatabase();
    const result = await syncWithESPN(db);
    return NextResponse.json({ ok: true, ...result, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error('ESPN sync error:', error);
    return NextResponse.json(
      { error: 'sync failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest)  { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
