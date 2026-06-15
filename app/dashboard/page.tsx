'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Match {
  id: number;
  team1: string;
  team2: string;
  stage: string;
  date: string;
  result1: number | null;
  result2: number | null;
  status: string;
}

interface Ranking {
  id: number;
  name: string;
  championPrediction: string;
  championPoints: number;
  totalPredictions: number;
  correctPredictions: number;
  matchPoints: number;
  totalPoints: number;
}

interface Prediction {
  id: number;
  matchId: number;
  prediction1: number;
  prediction2: number;
  points: number;
  isWildcard: number;
  betType: 'exact' | 'draw' | 'team1' | 'team2';
}

interface PublicBet {
  matchId: number;
  betType: string;
  prediction1: number;
  prediction2: number;
  isWildcard: number;
  points: number;
  userName: string;
}

function renderBet(pred: Prediction, team1: string, team2: string, big = false) {
  const fs = big ? '2rem' : '1.5rem';
  if (pred.betType === 'draw') return <span style={{ fontWeight: 800, fontSize: big ? '1.15rem' : '0.9rem' }}>🤝 Empate</span>;
  if (pred.betType === 'team1') return <span style={{ fontWeight: 800, fontSize: big ? '1.05rem' : '0.85rem' }}>🏆 {team1}</span>;
  if (pred.betType === 'team2') return <span style={{ fontWeight: 800, fontSize: big ? '1.05rem' : '0.85rem' }}>🏆 {team2}</span>;
  return <span style={{ fontWeight: 800, fontSize: fs, letterSpacing: '-0.05em', lineHeight: 1 }}>{pred.prediction1} – {pred.prediction2}</span>;
}

function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#0f1f3d" stroke="#3b82f6" strokeWidth="1.5"/>
      <polygon points="20,6 25,11 23,17 17,17 15,11" fill="#3b82f6" opacity="0.35"/>
      <polygon points="7,17 12,13 16,17 14,23 8,23" fill="#3b82f6" opacity="0.25"/>
      <polygon points="33,17 28,13 24,17 26,23 32,23" fill="#3b82f6" opacity="0.25"/>
      <polygon points="11,31 14,25 20,26 26,25 29,31 20,35" fill="#3b82f6" opacity="0.2"/>
      <polygon points="20,7 21.2,10.6 25,10.6 22,12.8 23.1,16.4 20,14.2 16.9,16.4 18,12.8 15,10.6 18.8,10.6" fill="white" opacity="0.95"/>
      <text x="20" y="30" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="800" fontFamily="Inter,Arial,sans-serif" letterSpacing="-0.5">WMB</text>
    </svg>
  );
}

/**
 * Toma una fecha y devuelve el lunes 00:00 de su semana ISO.
 */
function mondayOf(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Agrupa una lista de partidos (ordenados por fecha) en las primeras N
 * semanas que contengan partidos a partir de una fecha base.
 * Si no hay partidos próximos en ese rango, retorna semanas vacías para
 * que el render muestre el estado "sin partidos" en lugar de nada.
 */
function groupMatchesByWeek(_matches: Match[], fromDate: Date, numWeeks: number) {
  // Siempre anclar desde el lunes de la semana actual para que los partidos
  // en curso (fecha ya pasada pero sin resultado) sigan apareciendo en el calendario.
  const startMonday = mondayOf(fromDate);

  const weeks: {
    weekNum: number; label: string; monday: Date; sunday: Date;
    matches: Match[]; days: { date: Date; matches: Match[] }[]; pendingCount: number;
  }[] = [];

  for (let i = 0; i < numWeeks; i++) {
    const monday = new Date(startMonday);
    monday.setDate(startMonday.getDate() + i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    weeks.push({
      weekNum: i + 1, label: `Semana ${i + 1}`,
      monday, sunday,
      matches: [], days: [], pendingCount: 0,
    });
  }

  return weeks;
}

function formatDayHeader(date: Date) {
  return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const podiumConfig = [
  { medalEmoji: '🥇', accent: '#f59e0b', bg: '#fffbeb', borderColor: '#fcd34d', tall: true },
  { medalEmoji: '🥈', accent: '#94a3b8', bg: '#f8fafc', borderColor: '#cbd5e1', tall: false },
  { medalEmoji: '🥉', accent: '#cd7c2e', bg: '#fff8f3', borderColor: '#fdba74', tall: false },
];

export default function Dashboard() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [publicBets, setPublicBets] = useState<Record<number, PublicBet[]>>({});
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'matches' | 'ranking' | 'my-predictions'>('calendar');
  const [prevRankings, setPrevRankings] = useState<{[id: number]: number}>({});
  const [matchBetsModal, setMatchBetsModal] = useState<{
    match: Match;
    bets: { betType: string; prediction1: number; prediction2: number; isWildcard: number; points: number; userName: string }[];
  } | null>(null);
  const [championPicker, setChampionPicker] = useState('');
  const [savingChampion, setSavingChampion] = useState(false);

  const saveChampion = async () => {
    if (!championPicker) return;
    setSavingChampion(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/user/champion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ championPrediction: championPicker }),
      });
      if (res.ok) {
        setUser((u: any) => ({ ...u, championPrediction: championPicker }));
        if (token) fetchData(token);
      }
    } finally {
      setSavingChampion(false);
    }
  };

  const openMatchBets = (match: Match) => {
    const matchDate = new Date(match.date);
    if (matchDate > new Date() && match.status !== 'live') return;
    setMatchBetsModal({ match, bets: publicBets[match.id] || [] });
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchData(token);
    const interval = setInterval(() => fetchData(token), 10000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (rankings.length === 0) return;
    const stored = localStorage.getItem('wmbPrevRankings');
    const now = Date.now();
    if (stored) {
      const { data, timestamp } = JSON.parse(stored);
      if (now - timestamp < 3600000) {
        setPrevRankings(data);
      } else {
        const pos: {[id: number]: number} = {};
        rankings.forEach((r, i) => { pos[r.id] = i + 1; });
        localStorage.setItem('wmbPrevRankings', JSON.stringify({ data: pos, timestamp: now }));
      }
    } else {
      const pos: {[id: number]: number} = {};
      rankings.forEach((r, i) => { pos[r.id] = i + 1; });
      localStorage.setItem('wmbPrevRankings', JSON.stringify({ data: pos, timestamp: now }));
    }
  }, [rankings.length]);

  const fetchData = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [matchesRes, rankingsRes, predictionsRes, publicBetsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/rankings'),
        fetch('/api/predictions', { headers }),
        fetch('/api/bets/public', { headers }),
      ]);
      if (!matchesRes.ok || !rankingsRes.ok || !predictionsRes.ok) throw new Error('Error');
      const [matchesData, rankingsData, predictionsData] = await Promise.all([
        matchesRes.json(), rankingsRes.json(), predictionsRes.json(),
      ]);
      setMatches(matchesData);
      setRankings(rankingsData);
      setPredictions(predictionsData);
      if (publicBetsRes.ok) setPublicBets(await publicBetsRes.json());
      setLoading(false);
      if (rankingsData.length > 0) {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const me = rankingsData.find((r: Ranking) => r.id === tokenData.userId) || rankingsData[0];
        setUser(me);
      }
    } catch {
      localStorage.removeItem('token');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <div style={{ textAlign: 'center' }}>
          <Logo size={48} />
          <p style={{ color: 'var(--muted)', fontWeight: 500, marginTop: 12 }}>Cargando...</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const nextMatches = matches.filter((m) => new Date(m.date) > now);

  // Historial de apuestas del jugador: cruza sus predicciones con los partidos.
  const myBets = predictions
    .map((pred) => ({ pred, match: matches.find((m) => m.id === pred.matchId) }))
    .filter((x): x is { pred: Prediction; match: Match } => !!x.match);
  const isResolved = (m: Match) => m.result1 !== null && m.result2 !== null;
  const myPending = myBets
    .filter((x) => !isResolved(x.match))
    .sort((a, b) => new Date(a.match.date).getTime() - new Date(b.match.date).getTime());
  const myResolved = myBets
    .filter((x) => isResolved(x.match))
    .sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());
  const totalBetPoints = myResolved.reduce((s, x) => s + (x.pred.points || 0), 0);

  // Lista de equipos del torneo (para elegir campeón), derivada de los partidos.
  const tournamentTeams = Array.from(
    new Set(matches.flatMap((m) => [m.team1, m.team2]))
  ).sort((a, b) => a.localeCompare(b, 'es'));

  // ¿El usuario todavía no eligió campeón? (cuentas nuevas quedan en "Por definir")
  const needsChampion = !!user && (!user.championPrediction || user.championPrediction === 'Por definir');

  // Agrupar por las próximas 3 semanas con partidos (relativo al próximo partido
  // disponible, no a la fecha del cliente — robusto si su sistema tiene mal la hora).
  // En el calendario solo mostramos partidos NO jugados (por jugar o en vivo),
  // para no ensuciar la vista y la búsqueda. Los ya jugados quedan en "Mis
  // Apuestas" y siguen accesibles al hacer clic para ver resultados/apuestas.
  const notPlayed = (m: Match) => m.result1 === null && m.status !== 'finished';
  const weeksWithDays = groupMatchesByWeek(matches, now, 3).map(w => {
    const wkMatches = matches.filter(m => {
      const d = new Date(m.date);
      return notPlayed(m) && d >= w.monday && d <= w.sunday;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const days: { date: Date; matches: Match[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(w.monday);
      d.setDate(w.monday.getDate() + i);
      days.push({ date: d, matches: wkMatches.filter(m => isSameDay(new Date(m.date), d)) });
    }
    const pendingCount = wkMatches.filter(m =>
      new Date(m.date) > now && !predictions.find(p => p.matchId === m.id)
    ).length;
    return { ...w, matches: wkMatches, days, pendingCount };
  });

  const horizonMatches = weeksWithDays.flatMap(w => w.matches);
  const horizonStart = weeksWithDays[0]?.monday ?? now;
  const horizonEnd = weeksWithDays[weeksWithDays.length - 1]?.sunday ?? now;
  const horizonPendingCount = horizonMatches.filter(m =>
    new Date(m.date) > now && !predictions.find(p => p.matchId === m.id)
  ).length;
  const myRankPos = rankings.findIndex(r => r.id === user?.id) + 1;

  const tabs = [
    { key: 'calendar' as const, label: '📅 Próximas 3 semanas', count: horizonPendingCount },
    { key: 'matches' as const, label: 'Partidos', count: nextMatches.length },
    { key: 'ranking' as const, label: 'Ranking', count: rankings.length },
    { key: 'my-predictions' as const, label: 'Mis Apuestas', count: predictions.length },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>

      {/* Navbar */}
      <nav style={{ background: 'linear-gradient(120deg, #08121f 0%, #0f1f3d 45%, #1a3260 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Logo size={34} />
            <span style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>Wartito Mundialito <span style={{ color: '#60a5fa' }}>Bets</span></span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</div>
              {user?.championPrediction && (
                <div style={{ color: '#93c5fd', fontSize: '0.75rem' }}>🏆 {user.championPrediction}</div>
              )}
            </div>
            <button onClick={() => { localStorage.removeItem('token'); router.push('/'); }}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Header strip */}
      {user && (
        <div style={{ background: 'linear-gradient(90deg, #0f1f3d 0%, #1a3260 60%, #2563eb 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600 }}>
              Hola, {user.name.split(' ')[0]}
            </span>
            <div style={{ display: 'flex', gap: 32 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontWeight: 800, fontSize: '1.7rem', lineHeight: 1, letterSpacing: '-0.04em' }}>{user.totalPoints || 0}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>puntos</div>
              </div>
              {myRankPos > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: myRankPos === 1 ? '#fcd34d' : 'white', fontWeight: 800, fontSize: '1.7rem', lineHeight: 1, letterSpacing: '-0.04em' }}>#{myRankPos}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>posición</div>
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontWeight: 800, fontSize: '1.7rem', lineHeight: 1, letterSpacing: '-0.04em' }}>{user.totalPredictions || 0}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>apuestas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Campeón ya elegido: bloqueado (no se puede cambiar) */}
        {!needsChampion && user?.championPrediction && (
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Tu campeón: <strong style={{ color: 'var(--navy)' }}>🏆 {user.championPrediction}</strong>
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', background: '#f1f5f9', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
              🔒 definitivo
            </span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 28, overflowX: 'auto' }}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                border: 'none', background: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap',
                color: activeTab === tab.key ? 'var(--navy)' : 'var(--muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--navy)' : '2px solid transparent',
                marginBottom: -1,
              }}>
              {tab.label}
              <span style={{ marginLeft: 6, background: activeTab === tab.key ? 'var(--navy)' : '#e2e8f0', color: activeTab === tab.key ? 'white' : 'var(--muted)', borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ====== CALENDAR TAB ====== */}
        {activeTab === 'calendar' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--navy)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Próximas 3 semanas
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>
                  Del {horizonStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })} al {horizonEnd.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                  {' · '}
                  {horizonPendingCount > 0
                    ? `${horizonPendingCount} partido${horizonPendingCount !== 1 ? 's' : ''} sin apostar`
                    : horizonMatches.length > 0
                      ? 'Estás al día con tus apuestas'
                      : 'Sin partidos programados'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#dcfce7', border: '1.5px solid #86efac', display: 'inline-block' }}></span>
                  Apostado
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fee2e2', border: '1.5px solid #fca5a5', display: 'inline-block' }}></span>
                  Sin apostar
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f1f5f9', border: '1.5px solid #cbd5e1', display: 'inline-block' }}></span>
                  Jugado
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {weeksWithDays.map((week) => {
                if (week.matches.length === 0) return null;
                const isCurrentWeek = week.monday <= now && now <= week.sunday;
                return (
                  <section key={week.weekNum}>
                    {/* Header de la semana */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
                      paddingBottom: 10, borderBottom: '2px solid var(--border)',
                    }}>
                      <div style={{
                        background: isCurrentWeek ? 'var(--navy)' : '#e2e8f0',
                        color: isCurrentWeek ? 'white' : 'var(--muted)',
                        borderRadius: 8, padding: '6px 14px',
                        fontWeight: 800, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {week.label}{isCurrentWeek ? ' · Actual' : ''}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'capitalize' }}>
                        {week.monday.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} — {week.sunday.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>
                        {week.matches.length} partido{week.matches.length !== 1 ? 's' : ''}
                        {week.pendingCount > 0 && <span style={{ color: '#dc2626', marginLeft: 8 }}>· {week.pendingCount} sin apostar</span>}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {week.days.map(({ date, matches: dayMatches }) => {
                        const isToday = isSameDay(date, now);
                        if (dayMatches.length === 0) return null;
                        return (
                          <div key={date.toISOString()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <div style={{
                                background: isToday ? 'var(--navy)' : 'var(--surface)',
                                color: isToday ? 'white' : 'var(--muted)',
                                border: `1px solid ${isToday ? 'var(--navy)' : 'var(--border)'}`,
                                borderRadius: 8, padding: '4px 12px',
                                fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize',
                              }}>
                                {isToday ? '📍 Hoy — ' : ''}{formatDayHeader(date)}
                              </div>
                              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                                {dayMatches.length} partido{dayMatches.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                              {dayMatches.map((match) => {
                        const pred = predictions.find(p => p.matchId === match.id);
                        const isLive = match.status === 'live';
                        const isPlayed = match.result1 !== null;
                        const isPast = new Date(match.date) < now;
                        const isExact = pred && isPlayed && pred.betType === 'exact' && pred.prediction1 === match.result1 && pred.prediction2 === match.result2;

                        let bgColor = '#ffffff';
                        let borderColor = 'var(--border)';
                        let leftAccent = 'transparent';
                        if (isLive) { bgColor = '#fff7ed'; borderColor = '#fed7aa'; leftAccent = '#f97316'; }
                        else if (isPlayed) { bgColor = '#f8fafc'; borderColor = '#cbd5e1'; leftAccent = '#cbd5e1'; }
                        else if (pred) { bgColor = '#f0fdf4'; borderColor = '#86efac'; leftAccent = '#22c55e'; }
                        else if (!isPast) { bgColor = '#fff7f7'; borderColor = '#fca5a5'; leftAccent = '#ef4444'; }

                        const clickable = !isPlayed && !isPast && !isLive;
                        const clickableFinished = isPast || isLive;
                        const cardStyle: React.CSSProperties = {
                          background: bgColor,
                          border: `1px solid ${borderColor}`,
                          borderLeft: `3px solid ${leftAccent}`,
                          borderRadius: 10,
                          padding: '14px 16px',
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'block',
                          cursor: clickable || clickableFinished ? 'pointer' : 'default',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        };
                        const CardWrapper: any = clickable ? Link : 'div';
                        const hoverHandlers = {
                          onMouseEnter: (e: any) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,31,61,0.08)';
                          },
                          onMouseLeave: (e: any) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          },
                        };
                        const wrapperProps: any = clickable
                          ? { href: `/predict/${match.id}`, style: cardStyle, ...hoverHandlers }
                          : clickableFinished
                          ? { style: cardStyle, onClick: () => openMatchBets(match), ...hoverHandlers }
                          : { style: cardStyle };
                        return (
                          <CardWrapper key={match.id} {...wrapperProps}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                              <div>
                                <span className="tag" style={{ marginBottom: 4, display: 'inline-block' }}>{match.stage}</span>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', lineHeight: 1.3 }}>
                                  {match.team1} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.8rem' }}>vs</span> {match.team2}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>
                                  {new Date(match.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {isLive && <div style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea580c', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />En vivo</div>}
                                {isPlayed && !isLive && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Finalizado</div>}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              {isPlayed ? (
                                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
                                  <div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resultado</div>
                                    <div style={{ fontWeight: 800, fontSize: '2rem', color: 'var(--navy)', letterSpacing: '-0.05em', lineHeight: 1 }}>{match.result1} – {match.result2}</div>
                                  </div>
                                  {pred && (
                                    <div>
                                      <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tu apuesta</div>
                                      <div style={{ color: 'var(--navy)' }}>{renderBet(pred, match.team1, match.team2, true)}</div>
                                    </div>
                                  )}
                                </div>
                              ) : pred ? (
                                <div>
                                  <div style={{ fontSize: '0.6rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tu apuesta ✓{pred.isWildcard === 1 ? ' ⚡' : ''}</div>
                                  <div style={{ color: '#166534' }}>{renderBet(pred, match.team1, match.team2, true)}</div>
                                </div>
                              ) : isPast ? (
                                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Sin apuesta registrada</span>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>⚠ Sin apostar aún</span>
                              )}

                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {isPlayed && pred && (
                                  <div style={{ textAlign: 'right' }}>
                                    {pred.isWildcard === 1 && (
                                      <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 700, marginBottom: 2 }}>⚡ x2</div>
                                    )}
                                    <span style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: isExact ? '#16a34a' : (pred.points || 0) > 0 ? '#2563eb' : '#ef4444' }}>
                                      {isExact ? '🎯' : (pred.points || 0) > 0 ? '✅' : '❌'} {pred.points || 0}pt{pred.points !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                                {!isPlayed && !isPast && (
                                  <span
                                    style={{ background: pred ? 'white' : 'var(--navy)', color: pred ? 'var(--navy)' : 'white', border: pred ? '1px solid var(--border)' : 'none', padding: '6px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 700, display: 'inline-block' }}>
                                    {pred ? 'Cambiar →' : 'Apostar →'}
                                  </span>
                                )}
                                {(isPast || isLive) && (
                                  <span style={{ background: isLive ? '#fff7ed' : '#eff6ff', color: isLive ? '#ea580c' : '#2563eb', border: `1px solid ${isLive ? '#fed7aa' : '#bfdbfe'}`, padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700 }}>
                                    {isLive ? '🔴 Ver apuestas' : '👁 Ver apuestas'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardWrapper>
                        );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {horizonMatches.length === 0 && (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                  <p style={{ fontWeight: 700, color: 'var(--navy)', margin: '0 0 6px' }}>Sin partidos en las próximas 3 semanas</p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>El admin tiene que cargar los partidos, espérate un cachito</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== MATCHES TAB ====== */}
        {activeTab === 'matches' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--navy)', margin: 0, letterSpacing: '-0.02em' }}>Próximos partidos</h2>
            </div>
            {nextMatches.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                <p style={{ color: 'var(--muted)', margin: 0 }}>Aún no hay partidos cargados, espera un poco</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {nextMatches.map((match) => {
                  const pred = predictions.find((p) => p.matchId === match.id);
                  return (
                    <div key={match.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `3px solid ${pred ? '#22c55e' : 'var(--border)'}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span className="tag">{match.stage}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                            {new Date(match.date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)' }}>
                          {match.team1} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>vs</span> {match.team2}
                        </div>
                      </div>
                      {pred ? (
                        <div style={{ textAlign: 'center', padding: '8px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
                          <div style={{ color: '#166534' }}>{renderBet(pred, match.team1, match.team2, true)}</div>
                          <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 3 }}>Tu apuesta</div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '6px 14px', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 8, minWidth: 80 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Sin apuesta aún</div>
                        </div>
                      )}
                      <Link href={`/predict/${match.id}`}
                        style={{ background: 'var(--navy)', color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        {pred ? 'Cambiar apuesta' : 'Apostar'}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====== RANKING TAB ====== */}
        {activeTab === 'ranking' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--navy)', margin: 0, letterSpacing: '-0.02em' }}>¿Quién va ganando?</h2>
            </div>

            {/* Podium — top 3 */}
            {rankings.length >= 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24, alignItems: 'flex-end' }}>
                {([1, 0, 2] as const).map((rankIdx) => {
                  if (!rankings[rankIdx]) return <div key={rankIdx} />;
                  const rank = rankings[rankIdx];
                  const pos = rankIdx + 1;
                  const cfg = podiumConfig[rankIdx];
                  const isMe = rank.id === user?.id;
                  const prevPos = prevRankings[rank.id];
                  const trend = prevPos !== undefined ? prevPos - pos : null;
                  return (
                    <div key={rank.id} style={{
                      background: cfg.bg,
                      border: `2px solid ${cfg.borderColor}`,
                      borderRadius: 14,
                      padding: rankIdx === 0 ? '28px 16px 22px' : '18px 12px 16px',
                      textAlign: 'center',
                      position: 'relative',
                      boxShadow: rankIdx === 0 ? `0 8px 28px ${cfg.accent}28` : 'none',
                    }}>
                      {trend !== null && trend !== 0 && (
                        <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.7rem', fontWeight: 800, color: trend > 0 ? '#16a34a' : '#ef4444', background: trend > 0 ? '#dcfce7' : '#fee2e2', borderRadius: 6, padding: '2px 6px' }}>
                          {trend > 0 ? `↑${trend}` : `↓${Math.abs(trend)}`}
                        </div>
                      )}
                      <div style={{ fontSize: rankIdx === 0 ? '2.6rem' : '2rem', marginBottom: 8, lineHeight: 1 }}>{cfg.medalEmoji}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--navy)', marginBottom: 6, lineHeight: 1.3 }}>
                        {rank.name}
                        {isMe && <span style={{ display: 'inline-block', fontSize: '0.62rem', color: '#2563eb', fontWeight: 800, background: '#dbeafe', borderRadius: 4, padding: '1px 6px', marginTop: 4 }}>TÚ</span>}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: rankIdx === 0 ? '2.6rem' : '2.1rem', color: cfg.accent, letterSpacing: '-0.05em', lineHeight: 1 }}>
                        {rank.totalPoints || 0}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>pts</div>
                      {rank.championPrediction && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>🏆 {rank.championPrediction}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4th place onwards */}
            {rankings.length > 3 && (
              <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>#</th>
                      <th style={{ textAlign: 'left' }}>Jugador</th>
                      <th style={{ textAlign: 'center' }}>Campeón</th>
                      <th style={{ textAlign: 'center' }}>Apuestas</th>
                      <th style={{ textAlign: 'center' }}>Pts Partidos</th>
                      <th style={{ textAlign: 'center' }}>Pts Campeón</th>
                      <th style={{ textAlign: 'center' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.slice(3).map((rank, idx) => {
                      const i = idx + 3;
                      const isMe = rank.id === user?.id;
                      const prevPos = prevRankings[rank.id];
                      const trend = prevPos !== undefined ? prevPos - (i + 1) : null;
                      return (
                        <tr key={rank.id} style={{ background: isMe ? '#eff6ff' : 'white' }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '0.875rem' }}>{i + 1}</span>
                              {trend !== null && trend !== 0 && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: trend > 0 ? '#16a34a' : '#ef4444', background: trend > 0 ? '#dcfce7' : '#fee2e2', borderRadius: 4, padding: '1px 5px' }}>
                                  {trend > 0 ? `↑${trend}` : `↓${Math.abs(trend)}`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.9rem' }}>
                              {rank.name}{isMe && <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>TÚ</span>}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>{rank.championPrediction || '—'}</td>
                          <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>{rank.totalPredictions || 0}</td>
                          <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: '#16a34a' }}>{rank.matchPoints || 0}</span></td>
                          <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: '#d97706' }}>{rank.championPoints || 0}</span></td>
                          <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--navy)' }}>{rank.totalPoints || 0}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 4, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>🎯 <strong>Marcador exacto:</strong> 3 pts <span style={{ color: '#64748b' }}>(o nada — hay que clavarlo)</span></div>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>🤝 <strong>Empate:</strong> 2 pts <span style={{ color: '#64748b' }}>(solo fase de grupos)</span></div>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>✅ <strong>Ganador:</strong> 1 pt</div>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>🏆 <strong>Campeón del mundial:</strong> +10 pts bonus</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', flexBasis: '100%' }}>⚽ Fases finales (octavos→final): solo <strong>Ganador</strong> o <strong>Marcador exacto</strong>; el ganador incluye alargue y penales.</div>
            </div>
          </div>
        )}

        {/* ====== MY PREDICTIONS TAB ====== */}
        {activeTab === 'my-predictions' && (
          <div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--navy)', margin: 0, letterSpacing: '-0.02em' }}>Historial de mis apuestas</h2>
              {myBets.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', background: '#f1f5f9', borderRadius: 8, padding: '6px 12px', fontWeight: 600, color: 'var(--navy)' }}>
                    {myBets.length} apuesta{myBets.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '0.8rem', background: '#dcfce7', borderRadius: 8, padding: '6px 12px', fontWeight: 700, color: '#16a34a' }}>
                    {totalBetPoints} pts ganados
                  </span>
                </div>
              )}
            </div>

            {myBets.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎲</div>
                <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>Todavía no has hecho ninguna apuesta. Anda a la pestaña de partidos y apuesta.</p>
                <button onClick={() => setActiveTab('calendar')} style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Ver partidos
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Apuestas pendientes (partido aún sin resultado) */}
                {myPending.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      ⏳ Pendientes ({myPending.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {myPending.map(({ pred, match }) => {
                        const started = new Date(match.date) <= now || match.status === 'live';
                        return (
                          <div key={match.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                                <span className="tag">{match.stage}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                                  {new Date(match.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {match.status === 'live' && <span style={{ fontSize: '0.68rem', color: '#ea580c', fontWeight: 700 }}>🔴 En vivo</span>}
                              </div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy)' }}>{match.team1} vs {match.team2}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Tu apuesta {pred.isWildcard === 1 ? '⚡' : ''}</div>
                              <div style={{ color: 'var(--navy)' }}>{renderBet(pred, match.team1, match.team2, true)}</div>
                            </div>
                            {!started ? (
                              <Link href={`/predict/${match.id}`} style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #bfdbfe', borderRadius: 7, padding: '6px 12px' }}>
                                Cambiar
                              </Link>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>🔒 cerrada</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Apuestas resueltas (con puntos ganados) */}
                {myResolved.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      ✅ Resueltas ({myResolved.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {myResolved.map(({ pred, match }) => {
                        const isExact = pred.betType === 'exact' && pred.prediction1 === match.result1 && pred.prediction2 === match.result2;
                        const pts = pred.points || 0;
                        const isCorrect = !isExact && pts > 0;
                        const accentColor = isExact ? '#10b981' : isCorrect ? '#3b82f6' : '#ef4444';
                        const outcome = isExact ? '🎯 Marcador exacto' : isCorrect ? (pred.betType === 'draw' ? '🤝 Empate acertado' : '✅ Acertaste') : '❌ No acertaste';
                        return (
                          <div key={match.id} className="card" onClick={() => openMatchBets(match)} title="Ver apuestas de todos" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `3px solid ${accentColor}`, cursor: 'pointer' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span className="tag">{match.stage}</span></div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy)' }}>{match.team1} vs {match.team2}</div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: accentColor, marginTop: 3 }}>{outcome}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Resultado</div>
                                <div style={{ fontWeight: 800, fontSize: '2rem', color: 'var(--navy)', letterSpacing: '-0.05em', lineHeight: 1 }}>{match.result1} – {match.result2}</div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Tu apuesta {pred.isWildcard === 1 ? '⚡' : ''}</div>
                                <div style={{ color: 'var(--navy)' }}>{renderBet(pred, match.team1, match.team2, true)}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', minWidth: 56 }}>
                              {pred.isWildcard === 1 && (
                                <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 700, marginBottom: 2 }}>⚡ x2</div>
                              )}
                              <div style={{ fontWeight: 800, fontSize: '2.2rem', letterSpacing: '-0.05em', lineHeight: 1, color: accentColor }}>
                                {pts > 0 ? `+${pts}` : '0'}
                              </div>
                              <div style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>pts</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ====== MODAL OBLIGATORIO: ELEGIR CAMPEÓN ====== */}
      {/* Bloquea toda la app hasta que el jugador elija campeón. Sin cerrar. */}
      {needsChampion && tournamentTeams.length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(8,18,31,0.78)',
          backdropFilter: 'blur(5px)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'white', borderRadius: 18, padding: '34px 28px',
            maxWidth: 440, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
          }}>
            <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 10 }}>🏆</div>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--navy)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Elige tu campeón del mundial
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 22px' }}>
              Antes de empezar a jugar, tienes que elegir quién va a salir campeón.
              Suma <strong style={{ color: '#d97706' }}>+10 puntos</strong> si aciertas.
              <br />⚠️ Es <strong>definitivo</strong>: no se puede cambiar después.
            </p>
            <select
              value={championPicker}
              onChange={(e) => setChampionPicker(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #d97706',
                fontSize: '1rem', fontWeight: 600, color: 'var(--navy)', background: 'white',
                fontFamily: 'inherit', cursor: 'pointer', marginBottom: 12,
              }}
            >
              <option value="">Selecciona un equipo...</option>
              {tournamentTeams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={saveChampion}
              disabled={!championPicker || savingChampion}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                background: !championPicker || savingChampion ? '#fcd34d' : '#d97706',
                color: 'white', fontWeight: 800, fontSize: '1rem',
                cursor: !championPicker || savingChampion ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {savingChampion ? 'Guardando...' : 'Confirmar mi campeón'}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '14px 0 0' }}>
              No puedes usar la app hasta elegir tu campeón.
            </p>
          </div>
        </div>
      )}

      {/* ====== MODAL: APUESTAS DEL PARTIDO ====== */}
      {matchBetsModal && (
        <div
          onClick={() => setMatchBetsModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, padding: '28px 24px',
              width: '100%', maxWidth: 480, maxHeight: '80vh',
              overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span className="tag">{matchBetsModal.match.stage}</span>
                {matchBetsModal.match.status === 'live' && (
                  <span style={{ background: '#fff7ed', color: '#ea580c', borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                    🔴 En vivo
                  </span>
                )}
                {matchBetsModal.match.result1 !== null && (
                  <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                    Resultado: {matchBetsModal.match.result1} – {matchBetsModal.match.result2}
                  </span>
                )}
              </div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>
                {matchBetsModal.match.team1} vs {matchBetsModal.match.team2}
              </h3>
            </div>

            {matchBetsModal.bets.length === 0 ? (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>Nadie apostó en este partido</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {matchBetsModal.bets.map((bet, i) => {
                  const betLabel = () => {
                    if (bet.betType === 'draw') return '🤝 Empate';
                    if (bet.betType === 'team1') return `🏆 ${matchBetsModal.match.team1}`;
                    if (bet.betType === 'team2') return `🏆 ${matchBetsModal.match.team2}`;
                    return `🎯 ${bet.prediction1} – ${bet.prediction2}`;
                  };
                  const hasPoints = bet.points > 0;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 10,
                      background: hasPoints ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${hasPoints ? '#bbf7d0' : 'var(--border)'}`,
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', marginBottom: 2 }}>
                          {bet.userName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                          {betLabel()}
                          {bet.isWildcard === 1 && <span style={{ marginLeft: 6, color: '#d97706', fontWeight: 700 }}>⚡ x2</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontWeight: 800, fontSize: '1.5rem', lineHeight: 1,
                          color: hasPoints ? '#16a34a' : '#94a3b8',
                        }}>
                          {matchBetsModal.match.result1 !== null ? (hasPoints ? `+${bet.points}` : '0') : '—'}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setMatchBetsModal(null)}
              style={{
                marginTop: 20, width: '100%', padding: '10px 0', borderRadius: 10,
                background: 'var(--navy)', color: 'white', fontWeight: 700,
                border: 'none', cursor: 'pointer', fontSize: '0.95rem',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
