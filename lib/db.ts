import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "bets.db");

let db: Database.Database;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function initDb() {
  const database = getDb();

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

  return database;
}

export function getDatabase() {
  return getDb();
}
