// ─── Modo Asado (evento especial sábado 27-jun-2026) ───────────────────────
// TODO el comportamiento del Modo Asado está encapsulado tras estas funciones.
// Fuera de la ventana del sábado (hora Chile), isAsadoDate/isAsadoModeActive
// devuelven false y la app se comporta EXACTAMENTE igual que siempre.
//
// Ventana = sábado 27-jun completo en hora Chile (UTC-4):
//   sáb 00:00 Chile = 2026-06-27T04:00Z   →   dom 00:00 Chile = 2026-06-28T04:00Z
// Comparación de strings ISO-UTC (lexicográfica) — válida para este formato.

export const ASADO_START_UTC = '2026-06-27T04:00:00.000Z';
export const ASADO_END_UTC = '2026-06-28T04:00:00.000Z';

/** ¿La fecha ISO (UTC) de un partido cae dentro del sábado del asado (hora Chile)? */
export function isAsadoDate(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return iso >= ASADO_START_UTC && iso < ASADO_END_UTC;
}

/** ¿Estamos AHORA dentro de la ventana del asado? (para prender el modo/visual) */
export function isAsadoModeActive(now: Date = new Date()): boolean {
  const t = now.toISOString();
  return t >= ASADO_START_UTC && t < ASADO_END_UTC;
}

export const ASADO_BONUS_QUINIELA = 3; // +3 por quiniela perfecta del día
