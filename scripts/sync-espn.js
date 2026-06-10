/**
 * Sincroniza fixtures + resultados desde la API pública de ESPN (sin API key).
 *
 * Uso: npm run sync-espn
 *
 * Las fechas se almacenan en UTC; el cliente las muestra en hora local.
 */

require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const path = require('path');

const ESPN_URL = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

const TEAMS_ES = {
  Mexico: 'México', 'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur', 'Korea Republic': 'Corea del Sur',
  Czechia: 'Chequia', Canada: 'Canadá',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina',
  'United States': 'Estados Unidos', USA: 'Estados Unidos', Paraguay: 'Paraguay',
  Qatar: 'Catar', Switzerland: 'Suiza', Brazil: 'Brasil', Morocco: 'Marruecos',
  Haiti: 'Haití', Scotland: 'Escocia', Australia: 'Australia',
  Türkiye: 'Turquía', Turkey: 'Turquía', Germany: 'Alemania',
  Curaçao: 'Curazao', Curacao: 'Curazao', Netherlands: 'Países Bajos',
  Japan: 'Japón', 'Ivory Coast': 'Costa de Marfil', "Côte d'Ivoire": 'Costa de Marfil',
  Ecuador: 'Ecuador', Sweden: 'Suecia', Tunisia: 'Túnez', Spain: 'España',
  'Cape Verde': 'Cabo Verde', Belgium: 'Bélgica', Egypt: 'Egipto',
  'Saudi Arabia': 'Arabia Saudita', Uruguay: 'Uruguay', Iran: 'Irán',
  'New Zealand': 'Nueva Zelanda', France: 'Francia', Senegal: 'Senegal',
  Iraq: 'Irak', Norway: 'Noruega', Argentina: 'Argentina', Algeria: 'Argelia',
  Austria: 'Austria', Jordan: 'Jordania', Portugal: 'Portugal',
  'DR Congo': 'RD Congo', 'Congo DR': 'RD Congo', England: 'Inglaterra',
  Croatia: 'Croacia', Ghana: 'Ghana', Panama: 'Panamá',
  Uzbekistan: 'Uzbekistán', Colombia: 'Colombia',
};

const TEAM_TO_GROUP = {
  México: 'A', Sudáfrica: 'A', 'Corea del Sur': 'A', Chequia: 'A',
  Canadá: 'B', 'Bosnia y Herzegovina': 'B', Catar: 'B', Suiza: 'B',
  Brasil: 'C', Marruecos: 'C', Haití: 'C', Escocia: 'C',
  'Estados Unidos': 'D', Paraguay: 'D', Australia: 'D', Turquía: 'D',
  Alemania: 'E', Curazao: 'E', 'Costa de Marfil': 'E', Ecuador: 'E',
  'Países Bajos': 'F', Japón: 'F', Suecia: 'F', Túnez: 'F',
  Bélgica: 'G', Egipto: 'G', Irán: 'G', 'Nueva Zelanda': 'G',
  España: 'H', 'Cabo Verde': 'H', 'Arabia Saudita': 'H', Uruguay: 'H',
  Francia: 'I', Senegal: 'I', Irak: 'I', Noruega: 'I',
  Argentina: 'J', Argelia: 'J', Austria: 'J', Jordania: 'J',
  Portugal: 'K', 'RD Congo': 'K', Uzbekistán: 'K', Colombia: 'K',
  Inglaterra: 'L', Croacia: 'L', Ghana: 'L', Panamá: 'L',
};

function translatePlaceholder(n) {
  let m;
  if ((m = n.match(/^Group ([A-L]) Winner$/))) return `1° Grupo ${m[1]}`;
  if ((m = n.match(/^Group ([A-L]) 2nd Place$/))) return `2° Grupo ${m[1]}`;
  if ((m = n.match(/^Third Place Group (.+)$/))) return `3° ${m[1]}`;
  if ((m = n.match(/^Round of 32 (\d+) Winner$/))) return `Ganador R32 #${m[1]}`;
  if ((m = n.match(/^Round of 16 (\d+) Winner$/))) return `Ganador 8vos #${m[1]}`;
  if ((m = n.match(/^Quarterfinal (\d+) Winner$/))) return `Ganador Cuartos #${m[1]}`;
  if ((m = n.match(/^Semifinal (\d+) Winner$/))) return `Ganador Semi #${m[1]}`;
  if ((m = n.match(/^Semifinal (\d+) Loser$/))) return `Perdedor Semi #${m[1]}`;
  return null;
}
function translateTeam(n) { return TEAMS_ES[n] || translatePlaceholder(n) || n; }

function deduceStage(dateUTC, t1, t2) {
  const t = dateUTC.getTime();
  const inRange = (a, b) => t >= Date.parse(a) && t < Date.parse(b);
  if (inRange('2026-06-11T00:00Z', '2026-06-28T07:00Z'))
    return `Grupo ${TEAM_TO_GROUP[t1] || TEAM_TO_GROUP[t2] || '?'}`;
  if (inRange('2026-06-28T07:00Z', '2026-07-04T07:00Z')) return 'Dieciseisavos';
  if (inRange('2026-07-04T07:00Z', '2026-07-09T07:00Z')) return 'Octavos de Final';
  if (inRange('2026-07-09T07:00Z', '2026-07-14T07:00Z')) return 'Cuartos de Final';
  if (inRange('2026-07-14T07:00Z', '2026-07-18T07:00Z')) return 'Semifinales';
  if (inRange('2026-07-18T07:00Z', '2026-07-19T07:00Z')) return 'Tercer Puesto';
  if (inRange('2026-07-19T07:00Z', '2026-07-20T07:00Z')) return 'Final';
  return 'Mundial 2026';
}

async function fetchDay(yyyymmdd) {
  const res = await fetch(`${ESPN_URL}?dates=${yyyymmdd}`);
  if (!res.ok) throw new Error(`ESPN ${res.status} for ${yyyymmdd}`);
  return (await res.json()).events || [];
}

function dateRange(startISO, endISO) {
  const out = [];
  const start = new Date(startISO);
  const end = new Date(endISO);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(
      d.getUTCFullYear() +
      String(d.getUTCMonth() + 1).padStart(2, '0') +
      String(d.getUTCDate()).padStart(2, '0')
    );
  }
  return out;
}

function recalcPointsFor(db, externalId, g1, g2) {
  const m = db.prepare('SELECT id FROM matches WHERE externalId = ?').get(externalId);
  if (!m) return;
  const preds = db.prepare('SELECT * FROM predictions WHERE matchId = ?').all(m.id);
  for (const p of preds) {
    let pts = 0;
    if (p.prediction1 === g1 && p.prediction2 === g2) pts = 3;
    else if (g1 === g2 && p.prediction1 === p.prediction2) pts = 2;
    else if ((g1 > g2 && p.prediction1 > p.prediction2) || (g1 < g2 && p.prediction1 < p.prediction2)) pts = 1;
    if (p.isWildcard) pts *= 2;
    db.prepare('UPDATE predictions SET points = ? WHERE id = ?').run(pts, p.id);
  }
}

async function main() {
  console.log('🌎 Sincronizando con ESPN (Mundial 2026)...\n');
  const dbPath = path.join(__dirname, '..', 'data', 'bets.db');
  const db = new Database(dbPath);

  const days = dateRange('2026-06-11', '2026-07-19');
  const events = [];
  for (const day of days) {
    try {
      const ev = await fetchDay(day);
      events.push(...ev);
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 80));
    } catch (e) {
      console.warn(`\n⚠ ${day}: ${e.message}`);
    }
  }
  console.log(`\n→ ${events.length} eventos recibidos de ESPN\n`);

  let inserted = 0, updated = 0, results = 0;

  for (const ev of events) {
    try {
      const c = ev.competitions[0];
      const home = c.competitors.find(x => x.homeAway === 'home');
      const away = c.competitors.find(x => x.homeAway === 'away');
      if (!home || !away) continue;

      const team1 = translateTeam(home.team.displayName);
      const team2 = translateTeam(away.team.displayName);
      const dateUTC = new Date(ev.date).toISOString();
      const stage = deduceStage(new Date(ev.date), team1, team2);
      const completed = c.status.type.completed;
      const state = c.status.type.state;
      const r1 = completed ? parseInt(home.score, 10) : null;
      const r2 = completed ? parseInt(away.score, 10) : null;
      const status = completed ? 'finished' : state === 'in' ? 'live' : 'scheduled';

      const ex = db.prepare('SELECT * FROM matches WHERE externalId = ?').get(ev.id);
      if (!ex) {
        db.prepare(`INSERT INTO matches (externalId, team1, team2, stage, date, result1, result2, status, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(ev.id, team1, team2, stage, dateUTC, r1, r2, status, Date.now());
        inserted++;
        if (completed) recalcPointsFor(db, ev.id, r1, r2);
      } else {
        if (ex.team1 !== team1 || ex.team2 !== team2 || ex.stage !== stage || ex.date !== dateUTC) {
          db.prepare('UPDATE matches SET team1=?, team2=?, stage=?, date=? WHERE externalId=?')
            .run(team1, team2, stage, dateUTC, ev.id);
          updated++;
        }
        if (ex.result1 !== r1 || ex.result2 !== r2 || ex.status !== status) {
          db.prepare('UPDATE matches SET result1=?, result2=?, status=? WHERE externalId=?')
            .run(r1, r2, status, ev.id);
          if (completed) recalcPointsFor(db, ev.id, r1, r2);
          results++;
        }
      }
    } catch (e) {
      console.warn(`⚠ evento ${ev.id}: ${e.message}`);
    }
  }

  console.log(`✅ ${inserted} nuevos, ${updated} fixture-updates, ${results} resultados actualizados`);
  db.close();
}

main().catch(err => { console.error('❌', err); process.exit(1); });
