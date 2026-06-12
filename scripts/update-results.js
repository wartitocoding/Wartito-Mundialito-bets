require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const path = require('path');
const https = require('https');

const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  console.error('❌ API_FOOTBALL_KEY no está configurada');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'data', 'bets.db');
const db = new Database(dbPath);

function fetchFromAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api-football-v1.p.rapidapi.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      },
    };

    https
      .request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject)
      .end();
  });
}

async function updateResults() {
  try {
    console.log('⚡ Actualizando resultados en vivo...\n');

    const data = await fetchFromAPI('/fixtures?live=all&league=1');

    if (!data.response || data.response.length === 0) {
      console.log('✓ No hay partidos en vivo en este momento');
      db.close();
      return;
    }

    let updatedCount = 0;

    for (const match of data.response) {
      const {
        fixture: { id: externalId },
        teams: { home, away },
        goals: { home: homeGoals, away: awayGoals },
      } = match;

      if (homeGoals !== null && awayGoals !== null) {
        try {
          const stmt = db.prepare(
            'UPDATE matches SET result1 = ?, result2 = ? WHERE externalId = ? AND (result1 IS NULL OR result2 IS NULL)'
          );
          const result = stmt.run(homeGoals, awayGoals, externalId);

          if (result.changes > 0) {
            updatedCount++;
            console.log(`  ✓ ${home.name} ${homeGoals} - ${awayGoals} ${away.name}`);

            // Calcular puntos
            calculatePointsForMatch(db, externalId, homeGoals, awayGoals);
          }
        } catch (err) {
          console.error(`Error actualizando ${home.name} vs ${away.name}:`, err.message);
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`\n✅ ${updatedCount} resultado(s) actualizado(s)`);
    } else {
      console.log('✓ No hay cambios en los resultados');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

function calculatePointsForMatch(db, externalId, actualGoals1, actualGoals2) {
  try {
    const match = db
      .prepare('SELECT id FROM matches WHERE externalId = ?')
      .get(externalId);

    if (!match) return;

    const predictions = db
      .prepare('SELECT * FROM predictions WHERE matchId = ?')
      .all(match.id);

    for (const prediction of predictions) {
      const betType = prediction.betType || 'exact';
      let points = 0;

      if (betType === 'exact') {
        // Todo-o-nada: solo suma si clava el marcador exacto.
        if (prediction.prediction1 === actualGoals1 && prediction.prediction2 === actualGoals2) points = 3;
      } else if (betType === 'draw') {
        if (actualGoals1 === actualGoals2) points = 2;
      } else if (betType === 'team1') {
        if (actualGoals1 > actualGoals2) points = 1;
      } else if (betType === 'team2') {
        if (actualGoals2 > actualGoals1) points = 1;
      }

      if (prediction.isWildcard) points = points * 2;

      db.prepare('UPDATE predictions SET points = ? WHERE id = ?').run(
        points,
        prediction.id
      );
    }
  } catch (err) {
    console.error('Error calculating points:', err.message);
  }
}

updateResults();
