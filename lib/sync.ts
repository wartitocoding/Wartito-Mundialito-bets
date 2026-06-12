import { getDatabase, initDb } from './db';
import { fetchWorldcupMatches, fetchLiveMatches } from './api-football';
import { calculatePoints, type BetType } from './scoring';

interface SyncResult {
  newMatches: number;
  updatedMatches: number;
  updatedResults: number;
  errors: string[];
}

export async function syncWorldcupMatches(year: number = 2026): Promise<SyncResult> {
  const result: SyncResult = {
    newMatches: 0,
    updatedMatches: 0,
    updatedResults: 0,
    errors: [],
  };

  try {
    initDb();
    const db = getDatabase();

    console.log(`🔄 Sincronizando partidos del mundial ${year}...`);

    const matches = await fetchWorldcupMatches(year);

    for (const match of matches) {
      try {
        const {
          fixture: { id: externalId, date, status },
          teams: { home, away },
          goals: { home: homeGoals, away: awayGoals },
        } = match;

        const existingMatch = db
          .prepare('SELECT * FROM matches WHERE externalId = ?')
          .get(externalId);

        if (!existingMatch) {
          db.prepare(
            'INSERT INTO matches (externalId, team1, team2, stage, date, result1, result2, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(
            externalId,
            home.name,
            away.name,
            'Mondiale',
            date,
            homeGoals,
            awayGoals,
            status.short,
            Date.now()
          );
          result.newMatches++;
        } else {
          // Actualizar si hay cambios en resultados
          if (homeGoals !== null && awayGoals !== null) {
            if (
              existingMatch.result1 !== homeGoals ||
              existingMatch.result2 !== awayGoals
            ) {
              db.prepare(
                'UPDATE matches SET result1 = ?, result2 = ?, status = ? WHERE externalId = ?'
              ).run(homeGoals, awayGoals, status.short, externalId);
              result.updatedResults++;
              console.log(
                `  ✓ Resultado actualizado: ${home.name} ${homeGoals} - ${awayGoals} ${away.name}`
              );
            }
          }
          result.updatedMatches++;
        }
      } catch (err) {
        result.errors.push(`Error procesando partido: ${err}`);
      }
    }

    console.log(`✅ Sincronización completada:`);
    console.log(`   - ${result.newMatches} partidos nuevos`);
    console.log(`   - ${result.updatedMatches} partidos actualizados`);
    console.log(`   - ${result.updatedResults} resultados actualizados`);

    return result;
  } catch (err) {
    result.errors.push(`Error en sincronización: ${err}`);
    return result;
  }
}

export async function updateLiveResults(): Promise<SyncResult> {
  const result: SyncResult = {
    newMatches: 0,
    updatedMatches: 0,
    updatedResults: 0,
    errors: [],
  };

  try {
    initDb();
    const db = getDatabase();

    console.log('⚡ Actualizando resultados en vivo...');

    const liveMatches = await fetchLiveMatches();

    for (const match of liveMatches) {
      try {
        const {
          fixture: { id: externalId },
          teams: { home, away },
          goals: { home: homeGoals, away: awayGoals },
        } = match;

        if (homeGoals !== null && awayGoals !== null) {
          const updated = db
            .prepare(
              'UPDATE matches SET result1 = ?, result2 = ? WHERE externalId = ? AND (result1 IS NULL OR result2 IS NULL)'
            )
            .run(homeGoals, awayGoals, externalId);

          if (updated.changes > 0) {
            result.updatedResults++;
            console.log(
              `  ✓ ${home.name} ${homeGoals} - ${awayGoals} ${away.name}`
            );

            // Calcular puntos para todos los usuarios que apostaron en este partido
            await calculateMatchPoints(db, externalId, homeGoals, awayGoals);
          }
        }
      } catch (err) {
        result.errors.push(`Error actualizando partido: ${err}`);
      }
    }

    if (result.updatedResults > 0) {
      console.log(`✅ ${result.updatedResults} resultados actualizados`);
    }

    return result;
  } catch (err) {
    result.errors.push(`Error en actualización: ${err}`);
    return result;
  }
}

function calculateMatchPoints(
  db: any,
  externalId: number,
  actualGoals1: number,
  actualGoals2: number
) {
  try {
    const match = db
      .prepare('SELECT id FROM matches WHERE externalId = ?')
      .get(externalId);

    if (!match) return;

    const predictions = db
      .prepare('SELECT * FROM predictions WHERE matchId = ?')
      .all(match.id);

    for (const prediction of predictions) {
      // Fuente única de verdad: lib/scoring.ts (3 exacto / 2 empate / 1 ganador, x2 comodín)
      const points = calculatePoints(
        {
          betType: (prediction.betType || 'exact') as BetType,
          prediction1: prediction.prediction1,
          prediction2: prediction.prediction2,
          isWildcard: prediction.isWildcard,
        },
        actualGoals1,
        actualGoals2,
      );

      db.prepare('UPDATE predictions SET points = ? WHERE id = ?').run(
        points,
        prediction.id
      );
    }
  } catch (err) {
    console.error('Error calculating points:', err);
  }
}
