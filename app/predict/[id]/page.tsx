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
}

export default function PredictPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [prediction1, setPrediction1] = useState(0);
  const [prediction2, setPrediction2] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchMatch();
  }, [matchId, router]);

  const fetchMatch = async () => {
    try {
      const res = await fetch('/api/matches');
      if (!res.ok) throw new Error('Error');
      const matches = await res.json();
      const found = matches.find((m: Match) => m.id === parseInt(matchId));
      if (!found) throw new Error('Not found');
      setMatch(found);
      setLoading(false);
    } catch {
      router.push('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId: parseInt(matchId), prediction1, prediction2 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar'); return; }
      router.push('/dashboard');
    } catch {
      setError('Error al conectar con el servidor');
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

  const numInput: React.CSSProperties = {
    width: '100%', padding: '16px 12px', border: '2px solid var(--border)', borderRadius: 10,
    fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', outline: 'none',
    background: 'white', fontFamily: 'inherit', color: 'var(--navy)', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--navy)', height: 56, display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50 }}>
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
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0 0 32px' }}>
          {new Date(match.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <div className="card" style={{ padding: '32px 28px' }}>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ¿Cuál será el resultado?
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{match.team1}</div>
                <input type="number" min="0" max="20" value={prediction1}
                  onChange={(e) => setPrediction1(parseInt(e.target.value) || 0)}
                  style={numInput} />
              </div>

              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--border)', paddingTop: 28 }}>—</div>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{match.team2}</div>
                <input type="number" min="0" max="20" value={prediction2}
                  onChange={(e) => setPrediction2(parseInt(e.target.value) || 0)}
                  style={numInput} />
              </div>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', justifyContent: 'center', gap: 24 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>🎯 Exacto: <strong style={{ color: 'var(--navy)' }}>+3 pts</strong></span>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>✅ Solo ganador: <strong style={{ color: 'var(--navy)' }}>+1 pt</strong></span>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" disabled={submitting}
                style={{ flex: 1, background: submitting ? '#94a3b8' : 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontSize: '0.9rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {submitting ? 'Guardando...' : 'Confirmar apuesta'}
              </button>
              <Link href="/dashboard"
                style={{ flex: 1, background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
