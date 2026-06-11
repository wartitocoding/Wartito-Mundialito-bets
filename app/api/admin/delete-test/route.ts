import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Borra SOLO las cuentas de prueba (email que empieza con 'diagtest_') y sus
 * apuestas. Endpoint temporal para limpiar el test de persistencia. No puede
 * tocar cuentas reales porque filtra por el prefijo de email de prueba.
 */
export async function GET(req: NextRequest) {
  const confirm = req.nextUrl.searchParams.get('confirm');
  if (confirm !== 'diagtest') {
    return NextResponse.json({ error: 'Falta ?confirm=diagtest' }, { status: 400 });
  }
  try {
    initDb();
    const db = getDatabase();
    const testUsers = db.prepare("SELECT id, email FROM users WHERE email LIKE 'diagtest_%'").all() as { id: number; email: string }[];
    let deletedPreds = 0;
    for (const u of testUsers) {
      const r = db.prepare('DELETE FROM predictions WHERE userId = ?').run(u.id);
      deletedPreds += r.changes;
    }
    const r2 = db.prepare("DELETE FROM users WHERE email LIKE 'diagtest_%'").run();
    return NextResponse.json({
      ok: true,
      deletedUsers: r2.changes,
      deletedPredictions: deletedPreds,
      emails: testUsers.map(u => u.email),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
