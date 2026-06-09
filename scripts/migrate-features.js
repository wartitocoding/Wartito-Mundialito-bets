const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'bets.db');
const db = new Database(dbPath);

console.log('🔄 Migrando base de datos a nuevas features...\n');

try {
  // 1. Achievements
  console.log('Creando tabla achievements...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      achievementType TEXT NOT NULL,
      earnedAt INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id),
      UNIQUE(userId, achievementType)
    );
  `);
  console.log('✓ achievements lista');

  // 2. Match Comments
  console.log('Creando tabla match_comments...');
  db.exec(`
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
  console.log('✓ match_comments lista');

  // 3. Notifications
  console.log('Creando tabla notifications...');
  db.exec(`
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
  console.log('✓ notifications lista');

  // 4. Challenges
  console.log('Creando tabla challenges...');
  db.exec(`
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
  console.log('✓ challenges lista');

  // 5. Parlays
  console.log('Creando tabla parlays...');
  db.exec(`
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
  console.log('✓ parlays lista');

  // 6. Weekly Stats
  console.log('Creando tabla weekly_stats...');
  db.exec(`
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
  console.log('✓ weekly_stats lista');

  console.log('\n✅ Migración completada exitosamente');
  console.log('\n📊 Nuevas tablas agregadas:');
  console.log('  - achievements (Logros y badges)');
  console.log('  - match_comments (Comentarios en partidos)');
  console.log('  - notifications (Notificaciones)');
  console.log('  - challenges (Head-to-Head)');
  console.log('  - parlays (Apuestas acumuladas)');
  console.log('  - weekly_stats (Estadísticas semanales)');
} catch (err) {
  if (err.message.includes('already exists')) {
    console.log('✓ Las tablas ya existen, migracion no necesaria');
  } else {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

db.close();
