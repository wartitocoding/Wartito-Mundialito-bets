require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const path = require('path');
const https = require('https');

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

if (!API_KEY) {
  console.error('❌ API_FOOTBALL_KEY no está configurada en .env.local');
  console.log('1. Obtén una API key gratuita en: https://rapidapi.com/api-sports/api/api-football');
  console.log('2. Agrega a .env.local: API_FOOTBALL_KEY=tu-api-key');
  process.exit(1);
}

const { dbPath } = require('./db-path');
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

async function syncMatches() {
  try {
    console.log('🔄 Sincronizando partidos del mundial 2026...\n');

    const data = await fetchFromAPI('/fixtures?league=1&season=2026');

    if (!data.response || data.response.length === 0) {
      console.log('⚠️  No se encontraron partidos del mundial 2026');
      console.log('💡 Usando partidos de 2022 como ejemplo...\n');

      const data2022 = await fetchFromAPI('/fixtures?league=1&season=2022');

      if (data2022.response) {
        await processMatches(data2022.response, '2022');
      }
    } else {
      await processMatches(data.response, '2026');
    }

    console.log('\n✅ Sincronización completada');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

async function processMatches(matches, year) {
  let newCount = 0;
  let updateCount = 0;

  for (const match of matches) {
    const {
      fixture: { id: externalId, date },
      teams: { home, away },
      goals: { home: homeGoals, away: awayGoals },
    } = match;

    try {
      const existing = db
        .prepare('SELECT * FROM matches WHERE externalId = ?')
        .get(externalId);

      if (!existing) {
        db.prepare(
          'INSERT INTO matches (externalId, team1, team2, stage, date, result1, result2, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          externalId,
          home.name,
          away.name,
          'Mondiale',
          date,
          homeGoals,
          awayGoals,
          Date.now()
        );
        newCount++;
      } else if (homeGoals !== null && awayGoals !== null) {
        if (
          existing.result1 !== homeGoals ||
          existing.result2 !== awayGoals
        ) {
          db.prepare(
            'UPDATE matches SET result1 = ?, result2 = ? WHERE externalId = ?'
          ).run(homeGoals, awayGoals, externalId);
          updateCount++;
        }
      }
    } catch (err) {
      console.error(`Error procesando ${home.name} vs ${away.name}:`, err.message);
    }
  }

  console.log(`📊 Resultados del mundial ${year}:`);
  console.log(`   ✓ ${newCount} partidos nuevos agregados`);
  console.log(`   ✓ ${updateCount} resultados actualizados`);
}

syncMatches();
