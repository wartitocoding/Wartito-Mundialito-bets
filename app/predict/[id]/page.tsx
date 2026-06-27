'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { isAsadoDate } from '@/lib/asado';
import { isEliminationStage } from '@/lib/scoring';

interface Match {
  id: number;
  team1: string;
  team2: string;
  stage: string;
  date: string;
  result1: number | null;
  result2: number | null;
}

type BetType = 'exact' | 'draw' | 'team1' | 'team2';

interface Prediction {
  id: number;
  matchId: number;
  prediction1: number;
  prediction2: number;
  isWildcard: number;
  betType: BetType;
}

function getPhase(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes('group') || s.includes('grupo')) return 'grupos';
  if (s.includes('quarter') || s.includes('cuarto')) return 'cuartos';
  if (s.includes('semi') || s.includes('tercer') || s.includes('3rd') || s.includes('third')) return 'semis';
  if (s.includes('dieciseis') || s.includes('32') || s.includes('round of 32')) return 'dieciseisavos';
  if (s.includes('octavo') || s.includes('round of 16')) return 'octavos';
  if (s.includes('final')) return 'final';
  return s.replace(/\s+/g, '_');
}

function getPhaseName(phase: string): string {
  const names: Record<string, string> = {
    grupos: 'Fase de Grupos', dieciseisavos: 'Dieciseisavos de Final', octavos: 'Octavos de Final',
    cuartos: 'Cuartos de Final', semis: 'Semifinales', final: 'Final',
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

  const [betType, setBetType] = useState<BetType>('exact');
  const [prediction1, setPrediction1] = useState(1);
  const [prediction2, setPrediction2] = useState(0);
  const [useWildcard, setUseWildcard] = useState(false);
  const [wildcardOpen, setWildcardOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [asadoConfirmed, setAsadoConfirmed] = useState(false); // animación sobria del asado

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchData(token);
  }, [matchId, router]);

  // Día del Asado: forzar marcador exacto (no se permite otro tipo).
  useEffect(() => {
    if (match && isAsadoDate(match.date)) setBetType('exact');
  }, [match]);

  // Eliminación (puede ir a penales): no existe "empate". Si quedó seleccionado,
  // lo cambiamos a marcador exacto.
  useEffect(() => {
    if (match && isEliminationStage(match.stage) && betType === 'draw') setBetType('exact');
  }, [match, betType]);

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
          setBetType(pred.betType || 'exact');
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

    // Día del Asado: el tipo de apuesta queda forzado a marcador exacto.
    const asado = match ? isAsadoDate(match.date) : false;
    // Eliminación: no existe "empate" — si llegara, se trata como marcador exacto.
    const elim = match ? isEliminationStage(match.stage) : false;
    const bt = asado ? 'exact' : (elim && betType === 'draw' ? 'exact' : betType);

    if (bt === 'exact') {
      if (!Number.isInteger(prediction1) || !Number.isInteger(prediction2)) {
        setError('Los marcadores deben ser números enteros.'); return;
      }
      if (prediction1 < 0 || prediction2 < 0) {
        setError('Los marcadores no pueden ser negativos.'); return;
      }
      if (prediction1 > 20 || prediction2 > 20) {
        setError('El marcador máximo permitido es 20 por equipo.'); return;
      }
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const body: any = {
        matchId: parseInt(matchId),
        betType: bt,
        isWildcard: useWildcard,
      };
      if (bt === 'exact') {
        body.prediction1 = prediction1;
        body.prediction2 = prediction2;
      }
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar'); return; }
      // En partidos del asado, mostramos la confirmación sobria ~2s y luego entramos.
      if (asado) {
        setAsadoConfirmed(true);
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }
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
  const isAsado = isAsadoDate(match.date); // Día del Asado: solo marcador exacto

  // Comodín de Asado: es ÚNICO para todo el día (separado del comodín normal por
  // fase). ¿El jugador ya lo aplicó en OTRO partido del asado?
  const asadoWildcardPred = isAsado ? predictions.find(p => {
    if (p.isWildcard !== 1 || p.matchId === parseInt(matchId)) return false;
    const m = allMatches.find(mm => mm.id === p.matchId);
    return !!m && isAsadoDate(m.date);
  }) : undefined;
  const asadoWildcardOnOther = !!asadoWildcardPred;
  const asadoWildcardMatchInfo = asadoWildcardPred ? allMatches.find(m => m.id === asadoWildcardPred.matchId) : null;

  // Eliminación = cualquier partido que puede ir a penales (todo lo que NO es
  // grupos): no se permite "empate", solo Ganador o Marcador exacto.
  const isElim = isEliminationStage(match.stage);

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
    ? allMatches.find(m => m.id === wildcardInPhase?.matchId) : null;

  const numInput: React.CSSProperties = {
    width: '100%', padding: '16px 12px', border: '2px solid var(--border)', borderRadius: 10,
    fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', outline: 'none',
    background: 'white', fontFamily: 'inherit', color: 'var(--navy)', boxSizing: 'border-box',
  };

  const dateLabel = matchDate.toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  type BetOption = { key: BetType; label: string; desc: string; pts: string; emoji: string };
  const betOptions: BetOption[] = [
    { key: 'exact', label: 'Marcador exacto', desc: 'Apuestas el resultado preciso', pts: '3 pts si aciertas', emoji: '🎯' },
    { key: 'draw',  label: 'Solo empate',     desc: 'Apuestas que terminan iguales',  pts: '2 pts si empatan',  emoji: '🤝' },
    { key: 'team1', label: `Gana ${match.team1}`, desc: 'Cualquier marcador a favor', pts: '1 pt si gana',     emoji: '🏆' },
    { key: 'team2', label: `Gana ${match.team2}`, desc: 'Cualquier marcador a favor', pts: '1 pt si gana',     emoji: '🏆' },
  ];
  // En eliminación no existe "empate": se quita la opción.
  const visibleBetOptions = isElim ? betOptions.filter(o => o.key !== 'draw') : betOptions;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Confirmación sobria del asado (estilo app) */}
      {asadoConfirmed && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#f6f0ea', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' }}>
          <span style={{ position: 'absolute', left: '32%', bottom: 80, fontSize: 16, opacity: 0, animation: 'asadoRise 2.6s ease-out .15s' }}>🔥</span>
          <span style={{ position: 'absolute', left: '50%', bottom: 80, fontSize: 17, opacity: 0, animation: 'asadoRise 2.6s ease-out .55s' }}>🥩</span>
          <span style={{ position: 'absolute', left: '64%', bottom: 80, fontSize: 15, opacity: 0, animation: 'asadoRise 2.6s ease-out 1s' }}>🔥</span>
          <div style={{ width: '100%', maxWidth: 320, background: '#fff', border: '1px solid #e7d8cd', borderRadius: 16, padding: '26px 22px', textAlign: 'center', animation: 'asadoPop .45s ease-out' }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26, color: '#ea580c', fontWeight: 800 }}>✓</div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#431407', letterSpacing: '-0.02em' }}>Apuesta confirmada</div>
            <div style={{ fontSize: '0.78rem', color: '#a8856b', margin: '3px 0 14px' }}>A la parrilla 🔥🥩</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderTop: '1px solid #f0e3d8', paddingTop: 13 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#431407' }}>{match.team1}</span>
              <span style={{ fontWeight: 800, fontSize: '1.5rem', color: '#431407', letterSpacing: '-0.05em' }}>{prediction1} – {prediction2}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#431407' }}>{match.team2}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9a3412', fontWeight: 700, marginTop: 8 }}>🎯 Marcador exacto{useWildcard ? ' · ⚡ comodín ×2' : ''}</div>
          </div>
        </div>
      )}
      <nav style={{ background: 'linear-gradient(120deg, #08121f 0%, #0f1f3d 45%, #1a3260 100%)', height: 56, display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{ color: '#93c5fd', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Volver
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>Wartito Mundialito <span style={{ color: '#60a5fa' }}>Bets</span></span>
        </div>
      </nav>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 8 }}>
          <span className="tag">{match.stage}</span>
        </div>
        <h1 style={{ fontWeight: 800, fontSize: '1.55rem', color: 'var(--navy)', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
          {match.team1} vs {match.team2}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0 0 28px', textTransform: 'capitalize' }}>
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
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '16px', marginBottom: 24, display: 'inline-block', minWidth: 200 }}>
                {existing.isWildcard === 1 && (
                  <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 700, marginBottom: 6 }}>⚡ COMODÍN APLICADO</div>
                )}
                <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tu apuesta</div>
                <BetSummary pred={existing} match={match} />
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
          <>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                {error}
              </div>
            )}
            {existing && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: '0.875rem', color: '#1e40af' }}>
                Tienes una apuesta registrada. Puedes modificarla hasta que empiece el partido.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ── Día del Asado: solo marcador exacto (sin selector) ── */}
              {isAsado ? (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#9a3412' }}>🔥 Día del Asado</div>
                  <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: 2 }}>Hoy solo se apuesta <strong>marcador exacto</strong> · clávalo para sumar 🎯</div>
                </div>
              ) : (
                <>
                  {/* ── Eliminación: aviso de que no hay empate ── */}
                  {isElim && (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e40af' }}>⚽ Fase de eliminación</div>
                      <div style={{ fontSize: '0.8rem', color: '#1e40af', marginTop: 2 }}>Acá no hay empate: <strong>Marcador exacto</strong> o <strong>Ganador</strong>. El ganador incluye alargue y penales 🥅</div>
                    </div>
                  )}
                  {/* ── SELECTOR DE TIPO DE APUESTA ── */}
                  <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    1. Elige cómo quieres apostar
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                    {visibleBetOptions.map(opt => {
                      const selected = betType === opt.key;
                      return (
                        <button key={opt.key} type="button" onClick={() => setBetType(opt.key)}
                          style={{
                            background: selected ? 'var(--navy)' : 'white',
                            color: selected ? 'white' : 'var(--navy)',
                            border: `2px solid ${selected ? 'var(--navy)' : 'var(--border)'}`,
                            borderRadius: 10, padding: '14px 12px', cursor: 'pointer',
                            textAlign: 'left', fontFamily: 'inherit',
                            transition: 'all 0.15s',
                          }}>
                          <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{opt.emoji}</div>
                          <div style={{ fontWeight: 800, fontSize: '0.875rem', marginBottom: 2 }}>{opt.label}</div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.75, marginBottom: 4 }}>{opt.desc}</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: selected ? '#fcd34d' : '#16a34a' }}>
                            +{opt.pts}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── PASO: ingresar marcador (siempre exacto en modo asado) ── */}
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isAsado ? 'Ingresa el marcador exacto' : `2. ${betType === 'exact' ? 'Ingresa el marcador' : 'Confirma tu apuesta'}`}
              </p>

              <div className="card" style={{ padding: '24px 24px', marginBottom: 20 }}>
                {(isAsado || betType === 'exact') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{match.team1}</div>
                      <input type="number" min="0" max="20" step="1" value={prediction1}
                        onChange={e => setPrediction1(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                        style={numInput} />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--border)', paddingTop: 24 }}>—</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{match.team2}</div>
                      <input type="number" min="0" max="20" step="1" value={prediction2}
                        onChange={e => setPrediction2(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                        style={numInput} />
                    </div>
                  </div>
                )}

                {betType === 'draw' && (
                  <div style={{ textAlign: 'center', padding: '16px 4px' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--navy)', marginBottom: 4 }}>
                      Apuestas que el partido <span style={{ color: '#16a34a' }}>termina en empate</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      No importa el marcador: 0–0, 1–1, 2–2, etc. cuentan igual.
                    </div>
                  </div>
                )}

                {betType === 'team1' && (
                  <div style={{ textAlign: 'center', padding: '16px 4px' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--navy)', marginBottom: 4 }}>
                      Apuestas que <span style={{ color: '#2563eb' }}>{match.team1}</span> gana
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      Cualquier marcador a favor de {match.team1} cuenta.
                    </div>
                  </div>
                )}

                {betType === 'team2' && (
                  <div style={{ textAlign: 'center', padding: '16px 4px' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--navy)', marginBottom: 4 }}>
                      Apuestas que <span style={{ color: '#2563eb' }}>{match.team2}</span> gana
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      Cualquier marcador a favor de {match.team2} cuenta.
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-resumen */}
              {isAsado ? (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 16px', marginBottom: 20, textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9a3412' }}>🎯 Marcador exacto: <strong>3 pts</strong> <span style={{ color: '#b45309' }}>(o nada — hay que clavarlo)</span></span>
                </div>
              ) : (
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>🎯 Exacto: <strong style={{ color: 'var(--navy)' }}>3 pts</strong></span>
                  {!isElim && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>🤝 Empate: <strong style={{ color: 'var(--navy)' }}>2 pts</strong></span>}
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>🏆 Ganador: <strong style={{ color: 'var(--navy)' }}>1 pt</strong></span>
                </div>
              )}

              {/* ── COMODÍN ── */}
              {isAsado ? (
                /* Comodín de Asado: ÚNICO para todo el día, separado del comodín por fase */
                <div style={{ marginBottom: 24 }}>
                  <button type="button" onClick={() => setWildcardOpen(!wildcardOpen)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: useWildcard ? '#fff7ed' : '#fffaf6',
                      border: `1px solid ${useWildcard ? '#fb923c' : '#fed7aa'}`,
                      borderRadius: (wildcardOpen || asadoWildcardOnOther) ? '8px 8px 0 0' : 8,
                      padding: '11px 16px', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 700, color: '#9a3412' }}>
                      <span style={{ fontSize: '1.1rem' }}>🔥</span>
                      {useWildcard ? 'Comodín de Asado activado — puntos ×2' : 'Comodín de Asado (dobla los puntos)'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#b45309', transform: (wildcardOpen || asadoWildcardOnOther) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                  </button>

                  {(wildcardOpen || asadoWildcardOnOther) && (
                    <div style={{ border: '1px solid #fed7aa', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px', background: 'white' }}>
                      {asadoWildcardOnOther ? (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.5rem' }}>🔒</span>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#9a3412', margin: '0 0 4px' }}>
                              Ya usaste tu comodín de asado
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                              Lo aplicaste en {asadoWildcardMatchInfo?.team1} vs {asadoWildcardMatchInfo?.team2}.
                              Es único: solo uno para todo el día del asado.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p style={{ fontSize: '0.875rem', color: '#431407', margin: '0 0 12px', lineHeight: 1.6 }}>
                            El <strong>comodín de asado</strong> dobla los puntos de este partido. Es <strong>único</strong> para todo el día.
                          </p>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={useWildcard} onChange={e => setUseWildcard(e.target.checked)}
                              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#ea580c' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#431407' }}>
                              Activar comodín de asado en este partido
                            </span>
                          </label>
                          <p style={{ fontSize: '0.75rem', color: '#b45309', margin: '10px 0 0', lineHeight: 1.5 }}>
                            🔥 Solo lo puedes usar en UN partido de hoy. Si no lo usas, se va con el asado (no se acumula).
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
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
                    <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px', background: 'white' }}>
                      {wildcardOnOtherMatch ? (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.5rem' }}>🔒</span>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--navy)', margin: '0 0 4px' }}>
                              Comodín ya usado en {getPhaseName(currentPhase)}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                              Lo usaste en {wildcardMatchInfo?.team1} vs {wildcardMatchInfo?.team2}.
                              Solo puedes usar un comodín por fase.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p style={{ fontSize: '0.875rem', color: 'var(--navy)', margin: '0 0 12px', lineHeight: 1.6 }}>
                            El comodín <strong>dobla los puntos</strong> que ganes en este partido.
                          </p>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={useWildcard} onChange={e => setUseWildcard(e.target.checked)}
                              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#f59e0b' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)' }}>
                              Activar comodín en este partido
                            </span>
                          </label>
                          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
                            ⚠ Solo 1 comodín por fase del torneo.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={submitting}
                style={{
                  width: '100%',
                  background: submitting ? '#94a3b8' : useWildcard ? '#d97706' : 'var(--navy)',
                  color: 'white', border: 'none', borderRadius: 8, padding: '14px',
                  fontSize: '0.95rem', fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}>
                {submitting ? 'Guardando...' : useWildcard ? '⚡ Confirmar apuesta con comodín' : existing ? 'Guardar cambios' : 'Confirmar apuesta'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function BetSummary({ pred, match }: { pred: Prediction; match: Match }) {
  if (pred.betType === 'draw') {
    return <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#166534', lineHeight: 1.2 }}>🤝 Empate</div>;
  }
  if (pred.betType === 'team1') {
    return <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#166534', lineHeight: 1.2 }}>🏆 Gana {match.team1}</div>;
  }
  if (pred.betType === 'team2') {
    return <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#166534', lineHeight: 1.2 }}>🏆 Gana {match.team2}</div>;
  }
  return (
    <div style={{ fontWeight: 800, fontSize: '2.2rem', color: '#166534', letterSpacing: '-0.05em', lineHeight: 1 }}>
      {pred.prediction1} – {pred.prediction2}
    </div>
  );
}
