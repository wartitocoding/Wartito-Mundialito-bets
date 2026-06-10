'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Match {
  id: number;
  team1: string;
  team2: string;
  stage: string;
  date: string;
  result1: number | null;
  result2: number | null;
}

interface Prediction {
  id: number;
  matchId: number;
  prediction1: number;
  prediction2: number;
  isWildcard: number;
}

function getPhase(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes('group') || s.includes('grupo')) return 'grupos';
  if (s.includes('quarter') || s.includes('cuarto')) return 'cuartos';
  if (s.includes('semi') || s.includes('tercer') || s.includes('3rd') || s.includes('third')) return 'semis';
  if (s.includes('16') || s.includes('octavo') || s.includes('round of 16')) return 'octavos';
  if (s.includes('final')) return 'final';
  return s.replace(/\s+/g, '_');
}

function getPhaseName(phase: string): string {
  const names: Record<string, string> = {
    grupos: 'Fase de Grupos',
    octavos: 'Octavos de Final',
    cuartos: 'Cuartos de Final',
    semis: 'Semifinales',
    final: 'Final',
  };
  return names[phase] || phase;
}

export default function PredictPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [existing, setExisting] = useState<Prediction | null>(null);
  const [prediction1, setPrediction1] = useState(0);
  const [prediction2, setPrediction2] = useState(0);
  const [useWildcard, setUseWildcard] = useState(false);
  const [wildcardOpen, setWildcardOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchData(token);
  }, [matchId, router]);

  const fetchData = async (token: string) => {
    try {
      const [matchesRes, predsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/predictions', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!matchesRes.ok) throw new Error('Error');
      const matches: Match[] = await matchesRes.json();
      setAllMatches(matches);
      const found = matches.find((m) => m.id === parseInt(matchId));
      if (!found) throw new Error('Not found');
      setMatch(found);

      if (predsRes.ok) {
        const preds: Prediction[] = await predsRes.json();
        setPredictions(preds);
        const pred = preds.find(p => p.matchId === parseInt(matchId));
        if (pred) {
          setExisting(pred);
          setPrediction1(pred.prediction1);
          setPrediction2(pred.prediction2);
          setUseWildcard(pred.isWildcard === 1);
          if (pred.isWildcard === 1) setWildcardOpen(true);
        }
      }
      setLoading(false);
    } catch {
      router.push('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!Number.isInteger(prediction1) || !Number.isInteger(prediction2)) {
      setError('Los marcadores deben ser números enteros.');
      return;
    }
    if (prediction1 < 0 || prediction2 < 0) {
      setError('Los marcadores no pueden ser negativos.');
      return;
    }
    if (prediction1 > 20 || prediction2 > 20) {
      setError('El marcador máximo permitido es 20 por equipo.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId: parseInt(matchId), prediction1, prediction2, isWildcard: useWildcard }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar'); return; }
      router.push('/dashboard');
    } catch {
      setError('No se pudo conectar, inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <p style={{ color: 'var(--muted)' }}>Cargando...</p>
      </div>
    );
  }

  if (!match) return null;

  const matchDate = new Date(match.date);
  const isPast = matchDate < new Date();
  const isPlayed = match.result1 !== null;

  const currentPhase = getPhase(match.stage);
  const wildcardInPhase = predictions
    .filter(p => p.isWildcard === 1)
    .find(p => {
      const m = allMatches.find(m => m.id === p.matchId);
      return m && getPhase(m.stage) === currentPhase;
    });
  const wildcardOnThisMatch = wildcardInPhase?.matchId === parseInt(matchId);
  const wildcardOnOtherMatch = wildcardInPhase && !wildcardOnThisMatch;
  const wildcardMatchInfo = wildcardOnOtherMatch
    ? allMatches.find(m => m.id === wildcardInPhase?.matchId)
    : null;

  const numInput: React.CSSProperties = {
    width: '100%', padding: '16px 12px', border: '2px solid var(--border)', borderRadius: 10,
    fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', outline: 'none',
    background: 'white', fontFamily: 'inherit', color: 'var(--navy)', boxSizing: 'border-box',
  };

  const dateLabel = matchDate.toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <nav style={{ background: 'linear-gradient(120deg, #08121f 0%, #0f1f3d 45%, #1a3260 100%)', height: 56, display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{ color: '#93c5fd', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Volver
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>Wartito Mundialito <span style={{ color: '#60a5fa' }}>Bets</span></span>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 8 }}>
          <span className="tag">{match.stage}</span>
        </div>
        <h1 style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--navy)', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
          {match.team1} vs {match.team2}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0 0 32px', textTransform: 'capitalize' }}>
          {dateLabel}
        </p>

        {/* ── PARTIDO YA COMENZADO ── */}
        {isPast ? (
          <div className="card" style={{ padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--navy)', margin: '0 0 8px' }}>
              {isPlayed ? 'Partido finalizado' : 'Partido en curso'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0 0 24px', lineHeight: 1.6 }}>
              Las apuestas se cierran al inicio del partido.<br />
              {isPlayed ? `Resultado final: ${match.result1} – ${match.result2}` : 'Ya no es posible modificar tu apuesta.'}
            </p>
            {existing && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '16px', marginBottom: 24, display: 'inline-block', minWidth: 160 }}>
                {existing.isWildcard === 1 && (
                  <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 700, marginBottom: 6 }}>⚡ COMODÍN APLICADO</div>
                )}
                <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tu apuesta</div>
                <div style={{ fontWeight: 800, fontSize: '2.2rem', color: '#166534', letterSpacing: '-0.05em', lineHeight: 1 }}>
                  {existing.prediction1} – {existing.prediction2}
                </div>
              </div>
            )}
            {!existing && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', marginBottom: 24, color: '#dc2626', fontSize: '0.875rem' }}>
                No registraste una apuesta para este partido.
              </div>
            )}
            <Link href="/dashboard"
              style={{ display: 'inline-block', background: 'var(--navy)', color: 'white', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
              Volver al dashboard
            </Link>
          </div>
        ) : (
          /* ── FORMULARIO DE APUESTA ── */
          <>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                {error}
              </div>
            )}
            {existing && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: '0.875rem', color: '#1e40af' }}>
                Tienes una apuesta registrada ({existing.prediction1}–{existing.prediction2}). Puedes modificarla hasta que empiece el partido.
              </div>
            )}

            <div className="card" style={{ padding: '32px 28px' }}>
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ¿Cómo te la jugai? Elige el resultado
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{match.team1}</div>
                    <input type="number" min="0" max="20" step="1" value={prediction1}
                      onChange={(e) => setPrediction1(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                      style={numInput} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--border)', paddingTop: 28 }}>—</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{match.team2}</div>
                    <input type="number" min="0" max="20" step="1" value={prediction2}
                      onChange={(e) => setPrediction2(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                      style={numInput} />
                  </div>
                </div>

                {/* Outcome indicator */}
                <div style={{
                  textAlign: 'center', marginBottom: 20, padding: '8px 16px', borderRadius: 8,
                  background: prediction1 === prediction2 ? '#f0fdf4' : '#eff6ff',
                  border: `1px solid ${prediction1 === prediction2 ? '#86efac' : '#bfdbfe'}`,
                  fontSize: '0.85rem', fontWeight: 600,
                  color: prediction1 === prediction2 ? '#166534' : '#1e40af',
                }}>
                  {prediction1 > prediction2 && `Apostando que gana ${match.team1}`}
                  {prediction2 > prediction1 && `Apostando que gana ${match.team2}`}
                  {prediction1 === prediction2 && '🤝 Apostando por empate — vale 2 pts si aciertas'}
                </div>

                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>🎯 Exacto: <strong style={{ color: 'var(--navy)' }}>+3 pts</strong></span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>🤝 Empate acertado: <strong style={{ color: 'var(--navy)' }}>+2 pts</strong></span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>✅ Ganador acertado: <strong style={{ color: 'var(--navy)' }}>+1 pt</strong></span>
                </div>

                {/* ── COMODÍN ── */}
                <div style={{ marginBottom: 24 }}>
                  <button type="button" onClick={() => setWildcardOpen(!wildcardOpen)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: useWildcard ? '#fffbeb' : 'var(--surface)',
                      border: `1px solid ${useWildcard ? '#fcd34d' : 'var(--border)'}`,
                      borderRadius: wildcardOpen ? '8px 8px 0 0' : 8,
                      padding: '11px 16px', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 700, color: useWildcard ? '#92400e' : 'var(--navy)' }}>
                      <span style={{ fontSize: '1.1rem' }}>⚡</span>
                      {useWildcard ? 'Comodín activado — puntos x2' : 'Usar comodín (dobla los puntos)'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', transform: wildcardOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                  </button>

                  {wildcardOpen && (
                    <div style={{
                      border: '1px solid var(--border)', borderTop: 'none',
                      borderRadius: '0 0 8px 8px', padding: '16px',
                      background: 'white',
                    }}>
                      {wildcardOnOtherMatch ? (
                        /* Comodín ya usado en otro partido de esta fase */
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.5rem' }}>🔒</span>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--navy)', margin: '0 0 4px' }}>
                              Comodín ya usado en {getPhaseName(currentPhase)}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                              Lo usaste en {wildcardMatchInfo?.team1} vs {wildcardMatchInfo?.team2}.
                              Solo puedes usar un comodín por fase del torneo.
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Comodín disponible */
                        <>
                          <p style={{ fontSize: '0.875rem', color: 'var(--navy)', margin: '0 0 14px', lineHeight: 1.6 }}>
                            El comodín <strong>dobla todos los puntos</strong> que ganes en este partido.
                            Si aciertas el marcador exacto, en vez de 3 pts ganas 6.
                          </p>
                          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                            {[
                              { label: 'Marcador exacto', base: 3, with: 6 },
                              { label: 'Empate acertado', base: 2, with: 4 },
                              { label: 'Ganador acertado', base: 1, with: 2 },
                            ].map(r => (
                              <div key={r.label} style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', textAlign: 'center' }}>
                                <div style={{ color: '#92400e', fontWeight: 600 }}>{r.label}</div>
                                <div style={{ color: '#6b7280', marginTop: 2 }}>{r.base} pts → <strong style={{ color: '#92400e' }}>{r.with} pts</strong></div>
                              </div>
                            ))}
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={useWildcard} onChange={e => setUseWildcard(e.target.checked)}
                              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#f59e0b' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)' }}>
                              Activar comodín en este partido
                            </span>
                          </label>
                          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
                            ⚠ Tienes 1 comodín por fase. Una vez que empiece el partido no podrás cambiarlo.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button type="submit" disabled={submitting}
                  style={{
                    width: '100%',
                    background: submitting ? '#94a3b8' : useWildcard ? '#d97706' : 'var(--navy)',
                    color: 'white', border: 'none', borderRadius: 8, padding: '13px',
                    fontSize: '0.95rem', fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}>
                  {submitting ? 'Guardando...' : useWildcard ? '⚡ Confirmar apuesta con comodín' : existing ? 'Guardar cambios' : 'Confirmar apuesta'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
