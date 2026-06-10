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
}

function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle */}
      <circle cx="20" cy="20" r="19" fill="#0f1f3d" stroke="#3b82f6" strokeWidth="1.5"/>
      {/* Soccer ball pentagon shapes */}
      <polygon points="20,6 25,11 23,17 17,17 15,11" fill="#3b82f6" opacity="0.35"/>
      <polygon points="7,17 12,13 16,17 14,23 8,23" fill="#3b82f6" opacity="0.25"/>
      <polygon points="33,17 28,13 24,17 26,23 32,23" fill="#3b82f6" opacity="0.25"/>
      <polygon points="11,31 14,25 20,26 26,25 29,31 20,35" fill="#3b82f6" opacity="0.2"/>
      {/* Star (Chilean tribute) */}
      <polygon points="20,7 21.2,10.6 25,10.6 22,12.8 23.1,16.4 20,14.2 16.9,16.4 18,12.8 15,10.6 18.8,10.6" fill="white" opacity="0.95"/>
      {/* W monogram */}
      <text x="20" y="30" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="800" fontFamily="Inter,Arial,sans-serif" letterSpacing="-0.5">WMB</text>
    </svg>
  );
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function formatDayHeader(date: Date) {
  return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function Dashboard() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'matches' | 'ranking' | 'my-predictions'>('calendar');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchData(token);
    const interval = setInterval(() => fetchData(token), 10000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      const [matchesRes, rankingsRes, predictionsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/rankings'),
        fetch('/api/predictions', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!matchesRes.ok || !rankingsRes.ok || !predictionsRes.ok) throw new Error('Error');
      const [matchesData, rankingsData, predictionsData] = await Promise.all([
        matchesRes.json(), rankingsRes.json(), predictionsRes.json(),
      ]);
      setMatches(matchesData);
      setRankings(rankingsData);
      setPredictions(predictionsData);
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
  const { monday, sunday } = getWeekBounds();

  const nextMatches = matches.filter((m) => new Date(m.date) > now);
  const finishedMatches = matches.filter((m) => m.result1 !== null);

  // Weekly calendar: all matches this week (played or upcoming)
  const weekMatches = matches.filter((m) => {
    const d = new Date(m.date);
    return d >= monday && d <= sunday;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group by day
  const weekDays: { date: Date; matches: Match[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayMatches = weekMatches.filter(m => isSameDay(new Date(m.date), d));
    weekDays.push({ date: d, matches: dayMatches });
  }

  const weekMatchCount = weekMatches.filter(m => new Date(m.date) > now).length;

  const tabs = [
    { key: 'calendar' as const, label: '📅 Semana', count: weekMatchCount },
    { key: 'matches' as const, label: 'Partidos', count: nextMatches.length },
    { key: 'ranking' as const, label: 'Ranking', count: rankings.length },
    { key: 'my-predictions' as const, label: 'Mis Paltas', count: finishedMatches.length },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
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
            {/* Week header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--navy)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                  Semana del {monday.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })} al {sunday.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>
                  {weekMatchCount > 0
                    ? `${weekMatchCount} partido${weekMatchCount !== 1 ? 's' : ''} pendiente${weekMatchCount !== 1 ? 's' : ''} de paltar esta semana`
                    : weekMatches.length > 0
                      ? 'Ya están todos los partidos de la semana jugados'
                      : 'Sin partidos programados esta semana'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#dcfce7', border: '1.5px solid #86efac', display: 'inline-block' }}></span>
                  Paltado
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fee2e2', border: '1.5px solid #fca5a5', display: 'inline-block' }}></span>
                  Sin paltar
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f1f5f9', border: '1.5px solid #cbd5e1', display: 'inline-block' }}></span>
                  Jugado
                </span>
              </div>
            </div>

            {/* Days */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {weekDays.map(({ date, matches: dayMatches }) => {
                const isToday = isSameDay(date, now);
                if (dayMatches.length === 0) return null;
                return (
                  <div key={date.toISOString()}>
                    {/* Day header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{
                        background: isToday ? 'var(--navy)' : 'var(--surface)',
                        color: isToday ? 'white' : 'var(--muted)',
                        border: `1px solid ${isToday ? 'var(--navy)' : 'var(--border)'}`,
                        borderRadius: 8, padding: '4px 12px',
                        fontSize: '0.8rem', fontWeight: 700,
                        textTransform: 'capitalize',
                      }}>
                        {isToday ? '📍 Hoy — ' : ''}{formatDayHeader(date)}
                      </div>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
                        {dayMatches.length} partido{dayMatches.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Day matches */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                      {dayMatches.map((match) => {
                        const pred = predictions.find(p => p.matchId === match.id);
                        const isPlayed = match.result1 !== null;
                        const isPast = new Date(match.date) < now;
                        const isExact = pred && isPlayed && pred.prediction1 === match.result1 && pred.prediction2 === match.result2;

                        let bgColor = '#ffffff';
                        let borderColor = 'var(--border)';
                        if (isPlayed) { bgColor = '#f8fafc'; borderColor = '#cbd5e1'; }
                        else if (pred) { bgColor = '#f0fdf4'; borderColor = '#86efac'; }
                        else if (!isPast) { bgColor = '#fff7f7'; borderColor = '#fca5a5'; }

                        return (
                          <div key={match.id} style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 10, padding: '14px 16px' }}>
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
                                {isPlayed && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Finalizado</div>
                                )}
                              </div>
                            </div>

                            {/* Score area */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              {isPlayed ? (
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resultado</div>
                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--navy)' }}>{match.result1} – {match.result2}</div>
                                  </div>
                                  {pred && (
                                    <div>
                                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tu palta</div>
                                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--navy)' }}>{pred.prediction1} – {pred.prediction2}</div>
                                    </div>
                                  )}
                                </div>
                              ) : pred ? (
                                <div>
                                  <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tu palta ✓</div>
                                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534' }}>{pred.prediction1} – {pred.prediction2}</div>
                                </div>
                              ) : isPast ? (
                                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Sin palta registrada</span>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>⚠ Sin paltar aún</span>
                              )}

                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {isPlayed && pred && (
                                  <span style={{
                                    fontWeight: 800, fontSize: '1rem',
                                    color: isExact ? '#16a34a' : (pred.points || 0) > 0 ? '#2563eb' : '#ef4444'
                                  }}>
                                    {isExact ? '🎯' : (pred.points || 0) > 0 ? '✅' : '❌'} {pred.points || 0}pt{pred.points !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {!isPlayed && !isPast && (
                                  <Link href={`/predict/${match.id}`}
                                    style={{ background: pred ? 'white' : 'var(--navy)', color: pred ? 'var(--navy)' : 'white', border: pred ? '1px solid var(--border)' : 'none', padding: '6px 14px', borderRadius: 7, fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
                                    {pred ? 'Cambiar' : 'Paltar'}
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {weekMatches.length === 0 && (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                  <p style={{ fontWeight: 700, color: 'var(--navy)', margin: '0 0 6px' }}>Sin partidos esta semana</p>
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
                    <div key={match.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
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
                        <div style={{ textAlign: 'center', padding: '6px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534' }}>{pred.prediction1} – {pred.prediction2}</div>
                          <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>Tu palta</div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '6px 14px', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 8, minWidth: 80 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Sin palta aún</div>
                        </div>
                      )}
                      <Link href={`/predict/${match.id}`}
                        style={{ background: 'var(--navy)', color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        {pred ? 'Cambiar palta' : 'Paltar'}
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
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>#</th>
                    <th style={{ textAlign: 'left' }}>Jugador</th>
                    <th style={{ textAlign: 'center' }}>Campeón elegido</th>
                    <th style={{ textAlign: 'center' }}>Paltas</th>
                    <th style={{ textAlign: 'center' }}>Pts Partidos</th>
                    <th style={{ textAlign: 'center' }}>Pts Campeón</th>
                    <th style={{ textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((rank, i) => {
                    const isMe = rank.id === user?.id;
                    return (
                      <tr key={rank.id} style={{ background: isMe ? '#eff6ff' : 'white' }}>
                        <td>
                          <span style={{ fontWeight: 800, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2e' : 'var(--muted)', fontSize: i < 3 ? '1rem' : '0.875rem' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </span>
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
            <div style={{ marginTop: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>🎯 <strong>Resultado exacto:</strong> 3 pts</div>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>✅ <strong>Solo el ganador:</strong> 1 pt</div>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>🏆 <strong>La pegaste con el campeón:</strong> 10 pts bonus</div>
            </div>
          </div>
        )}

        {/* ====== MY PREDICTIONS TAB ====== */}
        {activeTab === 'my-predictions' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--navy)', margin: 0, letterSpacing: '-0.02em' }}>Mis paltas</h2>
            </div>
            {finishedMatches.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <p style={{ color: 'var(--muted)', margin: 0 }}>Todavía no se ha jugado nada, espera que arranque el mundial</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {finishedMatches.map((match) => {
                  const pred = predictions.find((p) => p.matchId === match.id);
                  const isExact = pred && pred.prediction1 === match.result1 && pred.prediction2 === match.result2;
                  const isCorrect = pred && !isExact && (
                    (match.result1! > match.result2! && pred.prediction1 > pred.prediction2) ||
                    (match.result1! < match.result2! && pred.prediction1 < pred.prediction2) ||
                    (match.result1 === match.result2 && pred.prediction1 === pred.prediction2)
                  );
                  const pts = pred?.points || 0;
                  return (
                    <div key={match.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: `3px solid ${isExact ? '#10b981' : isCorrect ? '#3b82f6' : pts === 0 && pred ? '#ef4444' : 'var(--border)'}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span className="tag">{match.stage}</span></div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy)' }}>{match.team1} vs {match.team2}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>RESULTADO</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--navy)' }}>{match.result1} – {match.result2}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>TU PALTA</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: pred ? 'var(--navy)' : 'var(--muted)' }}>
                            {pred ? `${pred.prediction1} – ${pred.prediction2}` : '—'}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 60 }}>
                        <div style={{ fontWeight: 800, fontSize: '1.4rem', color: isExact ? '#10b981' : isCorrect ? '#3b82f6' : pts === 0 && pred ? '#ef4444' : 'var(--muted)' }}>
                          {pts > 0 ? `+${pts}` : pred ? '0' : '—'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>pts</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
