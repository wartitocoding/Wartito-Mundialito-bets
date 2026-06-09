const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, '..', 'data', 'bets.db');
const db = new Database(dbPath);

const TEAMS = [
  'Argentina', 'Australia', 'Belgium', 'Brazil', 'Canada', 'Colombia', 'Costa Rica', 'Croatia',
  'Denmark', 'Ecuador', 'Egypt', 'England', 'France', 'Germany', 'Ghana', 'Greece',
  'Hungary', 'Iran', 'Italy', 'Japan', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Poland', 'Portugal', 'Romania', 'Saudi Arabia', 'Scotland', 'Senegal',
  'Serbia', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sweden',
  'Switzerland', 'Turkey', 'Ukraine', 'United States', 'Uruguay', 'Wales',
];

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
    console.log('\n🏆 Establecer Campeón del Mundial\n');

    console.log('Equipos disponibles:');
    TEAMS.sort().forEach((team, i) => {
      if ((i + 1) % 3 === 0) {
        console.log(`${team}`);
      } else {
        process.stdout.write(`${team.padEnd(20)}`);
      }
    });
    console.log('\n');

    const champion = await question('Ingresa el nombre del campeón: ');

    if (!TEAMS.includes(champion)) {
      console.log('❌ Equipo no válido');
      process.exit(1);
    }

    // Establecer campeón
    db.prepare(
      'INSERT OR REPLACE INTO world_cup_config (year, champion, updatedAt) VALUES (?, ?, ?)'
    ).run(2026, champion, Date.now());

    // Calcular puntos para usuarios que acertaron
    const winners = db
      .prepare('SELECT id, name FROM users WHERE championPrediction = ?')
      .all(champion);

    if (winners.length > 0) {
      for (const winner of winners) {
        db.prepare('UPDATE users SET championPoints = 10 WHERE id = ?').run(winner.id);
      }
    }

    console.log(`\n✅ Campeón establecido: ${champion}`);
    console.log(`🎉 ${winners.length} usuario(s) ganaron 10 puntos por acertar al campeón\n`);

    if (winners.length > 0) {
      console.log('Ganadores:');
      winners.forEach((w) => {
        console.log(`  - ${w.name}`);
      });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    rl.close();
    db.close();
  }
})();
