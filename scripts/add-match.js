const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, '..', 'data', 'bets.db');
const db = new Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

(async () => {
  try {
    console.log('➕ Agregar nuevo partido\n');

    const team1 = await question('Equipo 1: ');
    const team2 = await question('Equipo 2: ');
    const stage = await question('Fase (ej: Grupos, Octavos, Semis): ');
    const dateStr = await question('Fecha (ej: 2026-06-12 18:00): ');

    const result = db
      .prepare(
        'INSERT INTO matches (team1, team2, stage, date, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
      .run(team1, team2, stage, dateStr, Date.now());

    console.log(`\n✅ Partido creado con ID: ${result.lastInsertRowid}`);
    console.log(`   ${team1} vs ${team2} - ${stage}`);
    console.log(`   Fecha: ${dateStr}\n`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    rl.close();
    db.close();
  }
})();
