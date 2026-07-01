// Resuelve la MISMA ruta de DB que usa la app (ver lib/db.ts), para que los
// scripts de mantenimiento (add-user, set-champion, backups, etc.) siempre
// operen sobre el archivo real que usa el servidor — nunca uno aparte.
//
// Orden: 1) DATABASE_PATH si está definida, 2) /data si existe y es
// escribible (volumen persistente de Railway), 3) ./data/bets.db (fallback
// local para desarrollo, efímero en producción sin volumen).
const fs = require('fs');
const path = require('path');

function resolveDbPath() {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  try {
    fs.accessSync('/data', fs.constants.W_OK);
    return '/data/bets.db';
  } catch {
    // /data no existe o no es escribible → fallback local
  }
  return path.join(__dirname, '..', 'data', 'bets.db');
}

module.exports = { dbPath: resolveDbPath() };
