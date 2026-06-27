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
 * NOTA fases finales (octavos→final): el botón "empate" se oculta y el
 * ganador se decide incluyendo 90'+alargue+penales (quién avanza). Esa lógica
 * de "ganador = quien avanza" se maneja al guardar el resultado del partido
 * (lib/espn-sync), no acá: a esta función le llega el marcador final y, para
 * team1/team2, basta con que ese equipo figure como ganador del cruce.
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
  winner?: 'team1' | 'team2' | null,
): number {
  let points = 0;
  const { betType, prediction1: p1, prediction2: p2 } = pred;

  switch (betType) {
    case 'exact':
      // Todo-o-nada: solo suma si clava el marcador exacto (marcador de cancha,
      // 90'+alargue; los penales no cuentan para el "exacto").
      if (p1 === actual1 && p2 === actual2) points = 3;
      break;
    case 'draw':
      if (actual1 === actual2) points = 2;
      break;
    case 'team1':
      // En eliminación, "Ganador" = quien AVANZA (incluye alargue y penales): si
      // viene el flag de ganador, manda sobre el marcador de cancha. Si no viene
      // (grupos, o partido sin flag), se decide por el marcador, como siempre.
      if (winner ? winner === 'team1' : actual1 > actual2) points = 1;
      break;
    case 'team2':
      if (winner ? winner === 'team2' : actual2 > actual1) points = 1;
      break;
  }

  if (pred.isWildcard) points *= 2;
  return points;
}

/**
 * ¿El partido es de eliminación (puede terminar en penales)? = cualquier fase
 * que NO sea de grupos. En esas fases NO se permite apostar "empate": solo
 * Ganador o Marcador exacto, y el ganador incluye alargue y penales.
 */
export function isEliminationStage(stage: string | null | undefined): boolean {
  const s = (stage || '').toLowerCase();
  return s !== '' && !(s.includes('grupo') || s.includes('group'));
}
