/**
 * Cálculo de puntos para una apuesta, según el tipo de apuesta.
 *
 * Tipos:
 *  - 'exact'  → marcador exacto: TODO o NADA. 3 pts solo si clava el marcador.
 *  - 'draw'   → solo empate (2 pts si hay cualquier empate)
 *  - 'team1'  → solo ganador team1 (1 pt si team1 gana)
 *  - 'team2'  → solo ganador team2 (1 pt si team2 gana)
 *
 * Tabla:
 *   exact + marcador clavado     → 3 pts
 *   exact + NO clavado           → 0 pts  (regla general: exacto es todo-o-nada)
 *   draw  + empate cualquiera    → 2 pts
 *   team1 + team1 gana           → 1 pt
 *   team2 + team2 gana           → 1 pt
 *   cualquier otro caso          → 0 pts
 *
 * Si la apuesta usó el comodín (isWildcard = 1), se dobla el puntaje final.
 *
 * NOTA fases finales (octavos→final): el ganador se decide incluyendo
 * 90'+alargue+penales (quién avanza). Para las apuestas team1/team2 esa
 * decisión llega por el parámetro `winner` (lo calcula lib/espn-sync a partir
 * de los goles y, si hubo empate, de los penales/flag de ESPN). Si `winner` no
 * se entrega, el ganador se deduce del marcador de goles (fase de grupos).
 *
 * El marcador exacto y el empate SIEMPRE se evalúan con los goles de
 * 90'+alargue (los penales no cuentan para el marcador): una definición por
 * penales se registra con el resultado de goles igualado.
 */
export type BetType = 'exact' | 'draw' | 'team1' | 'team2';

/** Equipo que avanza en un cruce (incluye penales), o null si fue empate real. */
export type WinnerSide = 'team1' | 'team2' | null;

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
  winner?: WinnerSide,
): number {
  let points = 0;
  const { betType, prediction1: p1, prediction2: p2 } = pred;

  // Ganador del cruce: si `winner` viene definido (eliminatorias, puede incluir
  // penales) manda ese; si no, se decide por el marcador de goles.
  const winsTeam1 = winner != null ? winner === 'team1' : actual1 > actual2;
  const winsTeam2 = winner != null ? winner === 'team2' : actual2 > actual1;

  switch (betType) {
    case 'exact':
      // Todo-o-nada: solo suma si clava el marcador exacto (goles, sin penales).
      if (p1 === actual1 && p2 === actual2) points = 3;
      break;
    case 'draw':
      if (actual1 === actual2) points = 2;
      break;
    case 'team1':
      if (winsTeam1) points = 1;
      break;
    case 'team2':
      if (winsTeam2) points = 1;
      break;
  }

  if (pred.isWildcard) points *= 2;
  return points;
}
