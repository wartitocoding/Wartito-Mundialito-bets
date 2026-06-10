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

export default function Dashboard() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'ranking' | 'my-predictions'>('matches');

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
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p style={{ color: 'var(--muted)', fontWeight: 500 }}>Cargando...</p>
        </div>
      </div>
    );
  }

  const nextMatches = matches.filter((m) => new Date(m.date) > new Date());
  const finishedMatches = matches.filter((m) => m.result1 !== null);
  const tabs = [
    { key: 'matches', label: 'Partidos', count: nextMatches.length },
    { key: 'ranking', label: 'Ranking', count: rankings.length },
    { key: 'my-predictions', label: 'Mis Apuestas', count: finishedMatches.length },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontSize: 18 }}>⚽</span>
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
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                border: 'none', background: 'none', fontFamily: 'inherit',
                color: activeTab === tab.key ? 'var(--navy)' : 'var(--muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--navy)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
              {tab.label}
              <span style={{ marginLeft: 6, background: activeTab === tab.key ? 'var(--navy)' : '#e2e8f0', color: activeTab === tab.key ? 'white' : 'var(--muted)', borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* MATCHES TAB */}
        {activeTab === 'matches' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--navy)', margin: 0, letterSpacing: '-0.02em' }}>Próximos partidos</h2>
            </div>
            {nextMatches.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                <p style={{ color: 'var(--muted)', margin: 0 }}>No hay partidos próximos cargados</p>
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
                            {new Date(match.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)' }}>
                          {match.team1} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>vs</span> {match.team2}
                        </div>
                      </div>

                      {pred ? (
                        <div style={{ textAlign: 'center', padding: '6px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#166534' }}>{pred.prediction1} – {pred.prediction2}</div>
                          <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>Tu apuesta</div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '6px 14px', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 8, minWidth: 80 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Sin apuesta</div>
                        </div>
                      )}

                      <Link href={`/predict/${match.id}`}
                        style={{ background: 'var(--navy)', color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        {pred ? 'Editar' : 'Apostar'}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RANKING TAB */}
        {activeTab === 'ranking' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--navy)', margin: 0, letterSpacing: '-0.02em' }}>Tabla de posiciones</h2>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>#</th>
                    <th style={{ textAlign: 'left' }}>Jugador</th>
                    <th style={{ textAlign: 'center' }}>Campeón</th>
                    <th style={{ textAlign: 'center' }}>Partidos</th>
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
                            {rank.name} {isMe && <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>TÚ</span>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>{rank.championPrediction || '—'}</td>
                        <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>{rank.totalPredictions || 0}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>{rank.matchPoints || 0}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#d97706' }}>{rank.championPoints || 0}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--navy)' }}>{rank.totalPoints || 0}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>🎯 <strong>Exacto:</strong> 3 pts</div>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>✅ <strong>Solo ganador:</strong> 1 pt</div>
              <div style={{ fontSize: '0.825rem', color: '#1e40af' }}>🏆 <strong>Campeón correcto:</strong> 10 pts bonus</div>
            </div>
          </div>
        )}

        {/* MY PREDICTIONS TAB */}
        {activeTab === 'my-predictions' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--navy)', margin: 0, letterSpacing: '-0.02em' }}>Mis apuestas</h2>
            </div>
            {finishedMatches.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <p style={{ color: 'var(--muted)', margin: 0 }}>Todavía no se jugó ningún partido</p>
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
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                          <span className="tag">{match.stage}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy)' }}>{match.team1} vs {match.team2}</div>
                      </div>

                      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>RESULTADO</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--navy)' }}>{match.result1} – {match.result2}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>TU APUESTA</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: pred ? 'var(--navy)' : 'var(--muted)' }}>
                            {pred ? `${pred.prediction1} – ${pred.prediction2}` : '—'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', minWidth: 60 }}>
                        <div style={{
                          fontWeight: 800, fontSize: '1.4rem',
                          color: isExact ? '#10b981' : isCorrect ? '#3b82f6' : pts === 0 && pred ? '#ef4444' : 'var(--muted)'
                        }}>
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
