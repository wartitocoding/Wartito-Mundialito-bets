require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const { dbPath } = require('./db-path');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('🔧 Inicializando base de datos...');

db.pragma('journal_mode = WAL');

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );
`);

db.exec(`
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

db.exec(`
  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    matchId INTEGER NOT NULL,
    prediction1 INTEGER NOT NULL,
    prediction2 INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    isWildcard INTEGER DEFAULT 0,
    betType TEXT DEFAULT 'exact',
    createdAt INTEGER NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(matchId) REFERENCES matches(id),
    UNIQUE(userId, matchId)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS allowed_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    createdAt INTEGER NOT NULL
  );
`);

// Agregar algunos usuarios de ejemplo a la whitelist
const exampleEmails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

for (const email of exampleEmails) {
  try {
    db.prepare('INSERT INTO allowed_users (email, createdAt) VALUES (?, ?)').run(
      email,
      Date.now()
    );
    console.log(`✓ Usuario autorizado: ${email}`);
  } catch (err) {
    // Email ya existe
  }
}

console.log('\n✅ Base de datos inicializada correctamente');
console.log(`📍 Ubicación: ${dbPath}`);
console.log('\nPasos siguientes:');
console.log('1. Edita los emails en scripts/init-db.js para agregar tus usuarios');
console.log('2. Ejecuta: npm run init-db');
console.log('3. Inicia la app: npm run dev');

db.close();
