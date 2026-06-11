import { NextResponse } from 'next/server';
import { initDb, getDatabase, dbPath } from '@/lib/db';
import fs from 'fs';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico de ruta de DB (sin datos personales). Revela dónde escribe la
 * app, si el archivo existe y su tamaño, y si DATABASE_PATH está configurado.
 * Sirve para verificar que el volumen persistente esté bien montado en Railway.
 */
export async function GET() {
  try {
    initDb();
    const db = getDatabase();

    let fileExists = false;
    let fileSize = 0;
    try {
      const st = fs.statSync(dbPath);
      fileExists = true;
      fileSize = st.size;
    } catch {}

    // ¿Qué hay montado en /data (volumen típico de Railway)?
    let dataDirListing: string[] = [];
    try {
      dataDirListing = fs.readdirSync('/data');
    } catch {}

    const counts = {
      users: (db.prepare('SELECT COUNT(*) c FROM users').get() as any).c,
      predictions: (db.prepare('SELECT COUNT(*) c FROM predictions').get() as any).c,
      matches: (db.prepare('SELECT COUNT(*) c FROM matches').get() as any).c,
    };

    return NextResponse.json({
      resolvedDbPath: dbPath,
      DATABASE_PATH_env: process.env.DATABASE_PATH || '(no configurada)',
      cwd: process.cwd(),
      fileExists,
      fileSizeBytes: fileSize,
      dataVolumeMounted: dataDirListing.length > 0 || fs.existsSync('/data'),
      dataDirListing,
      counts,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
