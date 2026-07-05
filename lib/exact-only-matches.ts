// ─── Partidos "solo marcador exacto" (acordado entre los jugadores) ────────
// Estos cruces puntuales solo admiten apuesta de marcador exacto: no se
// puede apostar empate ni ganador. Fuera de estos partidos la app se
// comporta exactamente igual que siempre.

const EXACT_ONLY_PAIRS: [string, string][] = [
  ['Colombia', 'Ghana'],
  ['Portugal', 'Croacia'],
];

function norm(team: string): string {
  return team.trim().toLowerCase();
}

/** ¿Este partido (por sus equipos, sin importar quién es local) es "solo exacto"? */
export function isExactOnlyMatch(team1: string, team2: string): boolean {
  const a = norm(team1);
  const b = norm(team2);
  return EXACT_ONLY_PAIRS.some(([x, y]) => {
    const nx = norm(x);
    const ny = norm(y);
    return (a === nx && b === ny) || (a === ny && b === nx);
  });
}

// ─── Regla acordada el 5-jul-2026: desde los partidos del 6 de julio (hora
// Santiago) en adelante, TODAS las apuestas son solo marcador exacto ────────
// 6-jul 00:00 Santiago (GMT-4) = 2026-07-06T04:00Z. Comparación lexicográfica
// de strings ISO-UTC (mismo patrón que lib/asado.ts). Ojo: el partido del
// 5-jul 20:00 Santiago (= 06-jul 00:00Z) queda correctamente FUERA de la regla.
export const EXACT_ONLY_FROM_UTC = '2026-07-06T04:00:00.000Z';

/** ¿"Solo marcador exacto"? — por fecha (6-jul en adelante) o por cruce puntual acordado. */
export function isExactOnly(m: { team1: string; team2: string; date?: string | null }): boolean {
  if (m.date && m.date >= EXACT_ONLY_FROM_UTC) return true;
  return isExactOnlyMatch(m.team1, m.team2);
}
