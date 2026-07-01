require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');

const { dbPath } = require('./db-path');
const db = new Database(dbPath);

console.log('🔄 Migrando base de datos...\n');

try {
  // Verificar si las columnas ya existen
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const hasChampion = userColumns.some(col => col.name === 'championPrediction');

  if (!hasChampion) {
    console.log('Agregando columna championPrediction a users...');
    db.exec(`ALTER TABLE users ADD COLUMN championPrediction TEXT DEFAULT 'Unknown'`);
    console.log('✓ Columna championPrediction agregada');

    console.log('Agregando columna championPoints a users...');
    db.exec(`ALTER TABLE users ADD COLUMN championPoints INTEGER DEFAULT 0`);
    console.log('✓ Columna championPoints agregada');
  } else {
    console.log('✓ Columnas de campeón ya existen');
  }

  // Crear tabla world_cup_config si no existe
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_cup_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER UNIQUE,
      champion TEXT,
      updatedAt INTEGER
    );
  `);
  console.log('✓ Tabla world_cup_config lista');

  console.log('\n✅ Migración completada exitosamente\n');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ Las columnas ya existen, no es necesario migrar');
  } else {
    console.error('❌ Error durante la migración:', err.message);
    process.exit(1);
  }
}

db.close();
