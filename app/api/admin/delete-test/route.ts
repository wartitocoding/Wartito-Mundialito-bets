import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Borra SOLO cuentas de prueba (email 'diagtest_%'). Temporal, se quita luego.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('confirm') !== 'diagtest') {
    return NextResponse.json({ error: 'Falta ?confirm=diagtest' }, { status: 400 });
  }
  try {
    initDb();
    const db = getDatabase();
    const us = db.prepare("SELECT id FROM users WHERE email LIKE 'diagtest_%'").all() as { id: number }[];
    let dp = 0;
    for (const u of us) dp += db.prepare('DELETE FROM predictions WHERE userId = ?').run(u.id).changes;
    const r = db.prepare("DELETE FROM users WHERE email LIKE 'diagtest_%'").run();
    return NextResponse.json({ ok: true, deletedUsers: r.changes, deletedPredictions: dp });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
