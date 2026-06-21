import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ruta de la DB. Para que los datos sobrevivan a los redeploys necesitamos
// que apunte a un volumen persistente. Orden de resolución:
//   1. DATABASE_PATH si está definida (control explícito).
//   2. /data si hay un volumen montado y escribible (auto-detección Railway).
//      → Solo tienes que montar un volumen en /data; no hace falta env var.
//   3. ./data/bets.db (local / sin volumen) — efímero en contenedores.
function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  try {
    fs.accessSync("/data", fs.constants.W_OK);
    return "/data/bets.db"; // volumen persistente detectado
  } catch {
    // /data no existe o no es escribible → fallback local
  }
  return path.join(process.cwd(), "data", "bets.db");
}

export const dbPath = resolveDbPath();
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (!process.env.DATABASE_PATH && !dbPath.startsWith("/data")) {
  console.warn(
    "⚠️  La DB está en disco EFÍMERO (" + dbPath + "). En Railway los datos " +
    "se borrarán en cada redeploy. Monta un volumen en /data para que persistan."
  );
}

let db: Database.Database;
let initialized = false;

function getDb() {
  if (!db) {
    console.log(`🗄️  Abriendo DB en: ${dbPath} (DATABASE_PATH=${process.env.DATABASE_PATH || 'no configurada'})`);
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function initDb() {
  const database = getDb();

  // El schema y las migraciones solo necesitan correr UNA vez por proceso.
  // initDb() se llama en cada request; sin este guard, se reejecutaban las
  // migraciones (y un write de backfill) en cada llamada — puro desperdicio.
  if (initialized) return database;

  // Usuarios
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      championPrediction TEXT,
      championPoints INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
  `);

  // Partidos
  database.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      externalId TEXT UNIQUE,
      team1 TEXT NOT NULL,
      team2 TEXT NOT NULL,
      stage TEXT NOT NULL,
      date TEXT NOT NULL,
      result1 INTEGER,
      result2 INTEGER,
      status TEXT DEFAULT 'scheduled',
      createdAt INTEGER NOT NULL
    );
  `);

  // Apuestas/Predicciones
  database.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      matchId INTEGER NOT NULL,
      prediction1 INTEGER NOT NULL,
      prediction2 INTEGER NOT NULL,
      points INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(matchId) REFERENCES matches(id),
      UNIQUE(userId, matchId)
    );
  `);

  // Acceso de usuarios (whitelist)
  database.exec(`
    CREATE TABLE IF NOT EXISTS allowed_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);

  // Configuración del mundial
  database.exec(`
    CREATE TABLE IF NOT EXISTS world_cup_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER UNIQUE,
      champion TEXT,
      updatedAt INTEGER
    );
  `);

  // Achievements
  database.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      achievementType TEXT NOT NULL,
      earnedAt INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id),
      UNIQUE(userId, achievementType)
    );
  `);

  // ─── Migrations safe-to-rerun ─────────────────────────────────────
  // CREATE TABLE IF NOT EXISTS no actualiza schemas existentes; estas
  // ALTER TABLE rellenan columnas en DBs creadas con schemas viejos.

  const migrations = [
    { name: 'users.championPrediction', sql: 'ALTER TABLE users ADD COLUMN championPrediction TEXT' },
    { name: 'users.championPoints', sql: 'ALTER TABLE users ADD COLUMN championPoints INTEGER DEFAULT 0' },
    { name: 'predictions.isWildcard', sql: 'ALTER TABLE predictions ADD COLUMN isWildcard INTEGER DEFAULT 0' },
    { name: 'predictions.betType', sql: "ALTER TABLE predictions ADD COLUMN betType TEXT DEFAULT 'exact'" },
    { name: 'backfill betType', sql: "UPDATE predictions SET betType = 'exact' WHERE betType IS NULL" },
    { name: 'users.manualPoints', sql: 'ALTER TABLE users ADD COLUMN manualPoints INTEGER DEFAULT 0' },
    { name: 'matches.liveScore1', sql: 'ALTER TABLE matches ADD COLUMN liveScore1 INTEGER' },
    { name: 'matches.liveScore2', sql: 'ALTER TABLE matches ADD COLUMN liveScore2 INTEGER' },
  ];

  for (const mig of migrations) {
    try {
      database.exec(mig.sql);
      console.log(`✓ Migration OK: ${mig.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('already exists') && !msg.includes('duplicate')) {
        console.warn(`⚠ Migration warning (${mig.name}): ${msg}`);
      }
    }
  }

  // Comentarios en partidos
  database.exec(`
    CREATE TABLE IF NOT EXISTS match_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matchId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      comment TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(matchId) REFERENCES matches(id),
      FOREIGN KEY(userId) REFERENCES users(id)
    );
  `);

  // Notificaciones
  database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );
  `);

  // Head-to-Head Challenges
  database.exec(`
    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1Id INTEGER NOT NULL,
      user2Id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      user1Score INTEGER DEFAULT 0,
      user2Score INTEGER DEFAULT 0,
      winner INTEGER,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(user1Id) REFERENCES users(id),
      FOREIGN KEY(user2Id) REFERENCES users(id)
    );
  `);

  // Parlay/Acumulados
  database.exec(`
    CREATE TABLE IF NOT EXISTS parlays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      matches TEXT NOT NULL,
      multiplier REAL DEFAULT 1.5,
      totalPossiblePoints INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );
  `);

  // Estadísticas por semana
  database.exec(`
    CREATE TABLE IF NOT EXISTS weekly_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      weekNumber INTEGER NOT NULL,
      year INTEGER NOT NULL,
      correctPredictions INTEGER DEFAULT 0,
      totalPredictions INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES users(id),
      UNIQUE(userId, weekNumber, year)
    );
  `);

  initialized = true;
  return database;
}

export function getDatabase() {
  return getDb();
}
