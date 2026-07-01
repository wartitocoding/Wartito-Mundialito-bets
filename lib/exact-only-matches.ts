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
