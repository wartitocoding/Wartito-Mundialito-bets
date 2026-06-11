/**
 * Cálculo de puntos para una apuesta, según el tipo de apuesta.
 *
 * Tipos:
 *  - 'exact'  → marcador exacto (apuesta agresiva, máx 3 pts)
 *  - 'draw'   → solo empate (2 pts si cualquier empate)
 *  - 'team1'  → solo ganador team1 (1 pt si team1 gana, cualquier marcador)
 *  - 'team2'  → solo ganador team2 (1 pt si team2 gana)
 *
 * Tabla:
 *   exact + marcador clavado     → 3 pts
 *   exact + empate (no exacto)   → 2 pts
 *   exact + ganador correcto     → 1 pt
 *   draw  + empate cualquiera    → 2 pts
 *   team1 + team1 gana           → 1 pt
 *   team2 + team2 gana           → 1 pt
 *   cualquier otro caso          → 0 pts
 *
 * Si la apuesta usó el comodín (isWildcard = 1), se dobla el puntaje final.
 */
export type BetType = 'exact' | 'draw' | 'team1' | 'team2';

export interface PredictionInput {
  betType: BetType;
  prediction1: number;
  prediction2: number;
  isWildcard?: number | boolean;
}

export function calculatePoints(
  pred: PredictionInput,
  actual1: number,
  actual2: number,
): number {
  let points = 0;
  const { betType, prediction1: p1, prediction2: p2 } = pred;

  switch (betType) {
    case 'exact':
      if (p1 === actual1 && p2 === actual2) points = 3;
      else if (actual1 === actual2 && p1 === p2) points = 2;
      else if (
        (actual1 > actual2 && p1 > p2) ||
        (actual1 < actual2 && p1 < p2)
      ) points = 1;
      break;
    case 'draw':
      if (actual1 === actual2) points = 2;
      break;
    case 'team1':
      if (actual1 > actual2) points = 1;
      break;
    case 'team2':
      if (actual2 > actual1) points = 1;
      break;
  }

  if (pred.isWildcard) points *= 2;
  return points;
}
