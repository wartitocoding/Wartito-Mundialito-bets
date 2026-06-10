/**
 * Datos estáticos del Mundial 2026.
 *
 * - Traducción ES de los 48 equipos clasificados.
 * - Mapping equipo → grupo (A–L) para enriquecer el stage de cada partido,
 *   ya que la API pública de ESPN no incluye el grupo en el endpoint scoreboard.
 *
 * Si un equipo nuevo aparece en ESPN sin traducción, se usa el nombre original.
 */

export const TEAMS_ES: Record<string, string> = {
  Mexico: 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Korea Republic': 'Corea del Sur',
  Czechia: 'Chequia',
  Canada: 'Canadá',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina',
  'United States': 'Estados Unidos',
  USA: 'Estados Unidos',
  Paraguay: 'Paraguay',
  Qatar: 'Catar',
  Switzerland: 'Suiza',
  Brazil: 'Brasil',
  Morocco: 'Marruecos',
  Haiti: 'Haití',
  Scotland: 'Escocia',
  Australia: 'Australia',
  Türkiye: 'Turquía',
  Turkey: 'Turquía',
  Germany: 'Alemania',
  Curaçao: 'Curazao',
  Curacao: 'Curazao',
  Netherlands: 'Países Bajos',
  Japan: 'Japón',
  'Ivory Coast': 'Costa de Marfil',
  "Côte d'Ivoire": 'Costa de Marfil',
  Ecuador: 'Ecuador',
  Sweden: 'Suecia',
  Tunisia: 'Túnez',
  Spain: 'España',
  'Cape Verde': 'Cabo Verde',
  Belgium: 'Bélgica',
  Egypt: 'Egipto',
  'Saudi Arabia': 'Arabia Saudita',
  Uruguay: 'Uruguay',
  Iran: 'Irán',
  'New Zealand': 'Nueva Zelanda',
  France: 'Francia',
  Senegal: 'Senegal',
  Iraq: 'Irak',
  Norway: 'Noruega',
  Argentina: 'Argentina',
  Algeria: 'Argelia',
  Austria: 'Austria',
  Jordan: 'Jordania',
  Portugal: 'Portugal',
  'DR Congo': 'RD Congo',
  'Congo DR': 'RD Congo',
  England: 'Inglaterra',
  Croatia: 'Croacia',
  Ghana: 'Ghana',
  Panama: 'Panamá',
  Uzbekistan: 'Uzbekistán',
  Colombia: 'Colombia',
};

export const TEAM_TO_GROUP: Record<string, string> = {
  // A
  México: 'A', Sudáfrica: 'A', 'Corea del Sur': 'A', Chequia: 'A',
  // B
  Canadá: 'B', 'Bosnia y Herzegovina': 'B', Catar: 'B', Suiza: 'B',
  // C
  Brasil: 'C', Marruecos: 'C', Haití: 'C', Escocia: 'C',
  // D
  'Estados Unidos': 'D', Paraguay: 'D', Australia: 'D', Turquía: 'D',
  // E
  Alemania: 'E', Curazao: 'E', 'Costa de Marfil': 'E', Ecuador: 'E',
  // F
  'Países Bajos': 'F', Japón: 'F', Suecia: 'F', Túnez: 'F',
  // G
  Bélgica: 'G', Egipto: 'G', Irán: 'G', 'Nueva Zelanda': 'G',
  // H
  España: 'H', 'Cabo Verde': 'H', 'Arabia Saudita': 'H', Uruguay: 'H',
  // I
  Francia: 'I', Senegal: 'I', Irak: 'I', Noruega: 'I',
  // J
  Argentina: 'J', Argelia: 'J', Austria: 'J', Jordania: 'J',
  // K
  Portugal: 'K', 'RD Congo': 'K', Uzbekistán: 'K', Colombia: 'K',
  // L
  Inglaterra: 'L', Croacia: 'L', Ghana: 'L', Panamá: 'L',
};

/**
 * Traduce placeholders de bracket de ESPN al español.
 * Ejemplos:
 *  "Group A Winner" → "1° Grupo A"
 *  "Group A 2nd Place" → "2° Grupo A"
 *  "Round of 32 1 Winner" → "Ganador R32 #1"
 *  "Round of 16 5 Winner" → "Ganador 8vos #5"
 *  "Quarterfinal 2 Winner" → "Ganador Cuartos #2"
 *  "Semifinal 1 Winner" → "Ganador Semi #1"
 *  "Semifinal 1 Loser" → "Perdedor Semi #1"
 *  "Third Place Group A/E/H/I/J" → "3° A/E/H/I/J"
 */
function translatePlaceholder(name: string): string | null {
  let m;
  if ((m = name.match(/^Group ([A-L]) Winner$/))) return `1° Grupo ${m[1]}`;
  if ((m = name.match(/^Group ([A-L]) 2nd Place$/))) return `2° Grupo ${m[1]}`;
  if ((m = name.match(/^Third Place Group (.+)$/))) return `3° ${m[1]}`;
  if ((m = name.match(/^Round of 32 (\d+) Winner$/))) return `Ganador R32 #${m[1]}`;
  if ((m = name.match(/^Round of 16 (\d+) Winner$/))) return `Ganador 8vos #${m[1]}`;
  if ((m = name.match(/^Quarterfinal (\d+) Winner$/))) return `Ganador Cuartos #${m[1]}`;
  if ((m = name.match(/^Semifinal (\d+) Winner$/))) return `Ganador Semi #${m[1]}`;
  if ((m = name.match(/^Semifinal (\d+) Loser$/))) return `Perdedor Semi #${m[1]}`;
  return null;
}

export function translateTeam(name: string): string {
  return TEAMS_ES[name] || translatePlaceholder(name) || name;
}

/**
 * Deduce el stage de un partido a partir de su fecha UTC.
 * Calendario oficial Mundial 2026.
 */
export function deduceStage(dateUTC: Date, team1ES: string, team2ES: string): string {
  const t = dateUTC.getTime();
  const range = (start: string, end: string) =>
    t >= Date.parse(start) && t < Date.parse(end);

  if (range('2026-06-11T00:00Z', '2026-06-28T07:00Z')) {
    const g1 = TEAM_TO_GROUP[team1ES];
    const g2 = TEAM_TO_GROUP[team2ES];
    const group = g1 || g2 || '?';
    return `Grupo ${group}`;
  }
  if (range('2026-06-28T07:00Z', '2026-07-04T07:00Z')) return 'Dieciseisavos';
  if (range('2026-07-04T07:00Z', '2026-07-09T07:00Z')) return 'Octavos de Final';
  if (range('2026-07-09T07:00Z', '2026-07-14T07:00Z')) return 'Cuartos de Final';
  if (range('2026-07-14T07:00Z', '2026-07-18T07:00Z')) return 'Semifinales';
  if (range('2026-07-18T07:00Z', '2026-07-19T07:00Z')) return 'Tercer Puesto';
  if (range('2026-07-19T07:00Z', '2026-07-20T07:00Z')) return 'Final';
  return 'Mundial 2026';
}
