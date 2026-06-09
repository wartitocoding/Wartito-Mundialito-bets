import { getDatabase, initDb } from './db';

export const ACHIEVEMENT_TYPES = {
  FIRST_EXACT: 'first_exact', // Primera predicción exacta
  PERFECT_WEEK: 'perfect_week', // Semana sin errores
  LUCKY_BETTOR: 'lucky_bettor', // 10 aciertos seguidos
  MASTER_PREDICTOR: 'master_predictor', // 100+ predicciones exactas
  UPSET_SPECIALIST: 'upset_specialist', // Predecir sorpresas
  CHAMPION_CORRECT: 'champion_correct', // Acertar al campeón
  STREAK_MASTER: 'streak_master', // Racha de 20+ aciertos
  STATS_ANALYST: 'stats_analyst', // 500+ partidos predichos
};

export const ACHIEVEMENT_INFO = {
  first_exact: {
    name: '🎯 Primera Exacta',
    description: 'Predijiste tu primer resultado exacto',
    points: 5,
  },
  perfect_week: {
    name: '🌟 Semana Perfecta',
    description: 'Acertaste todos los partidos de una semana',
    points: 15,
  },
  lucky_bettor: {
    name: '🔥 Lucky Bettor',
    description: '10 predicciones exactas seguidas',
    points: 25,
  },
  master_predictor: {
    name: '👑 Predictor Maestro',
    description: '100+ predicciones exactas en total',
    points: 50,
  },
  upset_specialist: {
    name: '😲 Especialista en Sorpresas',
    description: 'Predijiste correctamente 5+ resultados inesperados',
    points: 20,
  },
  champion_correct: {
    name: '🏆 Campeón Adivinador',
    description: 'Acertaste al campeón mundial',
    points: 10,
  },
  streak_master: {
    name: '⚡ Maestro de Rachas',
    description: '20+ predicciones exactas seguidas',
    points: 40,
  },
  stats_analyst: {
    name: '📊 Analista de Datos',
    description: '500+ partidos predichos',
    points: 30,
  },
};

export function checkAndAwardAchievements(userId: number) {
  initDb();
  const db = getDatabase();
  const awarded = [];

  // 1. First Exact
  if (!hasAchievement(userId, ACHIEVEMENT_TYPES.FIRST_EXACT)) {
    const hasExact = db
      .prepare('SELECT COUNT(*) as count FROM predictions WHERE userId = ? AND points = 3')
      .get(userId) as any;

    if (hasExact.count > 0) {
      awardAchievement(userId, ACHIEVEMENT_TYPES.FIRST_EXACT);
      awarded.push(ACHIEVEMENT_TYPES.FIRST_EXACT);
    }
  }

  // 2. Perfect Week
  if (!hasAchievement(userId, ACHIEVEMENT_TYPES.PERFECT_WEEK)) {
    const weekStats = db
      .prepare(`
        SELECT COUNT(*) as total, SUM(CASE WHEN points > 0 THEN 1 ELSE 0 END) as correct
        FROM predictions p
        JOIN matches m ON p.matchId = m.id
        WHERE p.userId = ?
        AND strftime('%W', m.date) = strftime('%W', 'now')
        AND p.createdAt > (SELECT MAX(createdAt) - 604800000 FROM predictions)
      `)
      .get(userId) as any;

    if (weekStats.total >= 5 && weekStats.total === weekStats.correct) {
      awardAchievement(userId, ACHIEVEMENT_TYPES.PERFECT_WEEK);
      awarded.push(ACHIEVEMENT_TYPES.PERFECT_WEEK);
    }
  }

  // 3. Lucky Bettor (10 exactas seguidas)
  if (!hasAchievement(userId, ACHIEVEMENT_TYPES.LUCKY_BETTOR)) {
    if (getCurrentStreak(userId) >= 10) {
      awardAchievement(userId, ACHIEVEMENT_TYPES.LUCKY_BETTOR);
      awarded.push(ACHIEVEMENT_TYPES.LUCKY_BETTOR);
    }
  }

  // 4. Master Predictor
  if (!hasAchievement(userId, ACHIEVEMENT_TYPES.MASTER_PREDICTOR)) {
    const exactCount = db
      .prepare('SELECT COUNT(*) as count FROM predictions WHERE userId = ? AND points = 3')
      .get(userId) as any;

    if (exactCount.count >= 100) {
      awardAchievement(userId, ACHIEVEMENT_TYPES.MASTER_PREDICTOR);
      awarded.push(ACHIEVEMENT_TYPES.MASTER_PREDICTOR);
    }
  }

  // 5. Streak Master
  if (!hasAchievement(userId, ACHIEVEMENT_TYPES.STREAK_MASTER)) {
    if (getCurrentStreak(userId) >= 20) {
      awardAchievement(userId, ACHIEVEMENT_TYPES.STREAK_MASTER);
      awarded.push(ACHIEVEMENT_TYPES.STREAK_MASTER);
    }
  }

  // 6. Stats Analyst
  if (!hasAchievement(userId, ACHIEVEMENT_TYPES.STATS_ANALYST)) {
    const totalCount = db
      .prepare('SELECT COUNT(*) as count FROM predictions WHERE userId = ?')
      .get(userId) as any;

    if (totalCount.count >= 500) {
      awardAchievement(userId, ACHIEVEMENT_TYPES.STATS_ANALYST);
      awarded.push(ACHIEVEMENT_TYPES.STATS_ANALYST);
    }
  }

  return awarded;
}

function hasAchievement(userId: number, type: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare('SELECT id FROM achievements WHERE userId = ? AND achievementType = ?')
    .get(userId, type);
  return !!result;
}

function awardAchievement(userId: number, type: string) {
  const db = getDatabase();
  try {
    db.prepare(
      'INSERT INTO achievements (userId, achievementType, earnedAt) VALUES (?, ?, ?)'
    ).run(userId, type, Date.now());
  } catch (err) {
    // Already exists
  }
}

export function getUserAchievements(userId: number) {
  initDb();
  const db = getDatabase();
  return db
    .prepare('SELECT achievementType, earnedAt FROM achievements WHERE userId = ? ORDER BY earnedAt DESC')
    .all(userId);
}

export function getCurrentStreak(userId: number): number {
  const db = getDatabase();
  const predictions = db
    .prepare(
      'SELECT points FROM predictions WHERE userId = ? ORDER BY createdAt DESC LIMIT 100'
    )
    .all(userId) as any[];

  let streak = 0;
  for (const pred of predictions) {
    if (pred.points === 3) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
