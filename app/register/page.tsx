'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TEAMS = [
  'Argentina', 'Australia', 'Belgium', 'Brazil', 'Canada', 'Colombia', 'Costa Rica', 'Croatia',
  'Denmark', 'Ecuador', 'Egypt', 'England', 'France', 'Germany', 'Ghana', 'Greece',
  'Hungary', 'Iran', 'Italy', 'Japan', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Poland', 'Portugal', 'Romania', 'Saudi Arabia', 'Scotland', 'Senegal',
  'Serbia', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sweden',
  'Switzerland', 'Turkey', 'Ukraine', 'United States', 'Uruguay', 'Wales',
];

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [championPrediction, setChampionPrediction] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!championPrediction) { setError('Tienes que elegir al campeón po, no te puedes quedar sin eso.'); setLoading(false); return; }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, championPrediction }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error en el registro'); return; }
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch {
      setError('No se pudo conectar, inténtalo de nuevo po.');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: 'white',
    boxSizing: 'border-box', fontFamily: 'inherit', color: 'var(--text)',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'var(--navy)', height: 56, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 18 }}>⚽</span>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>Wartito Mundialito <span style={{ color: '#60a5fa' }}>Bets</span></span>
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--navy)' }}>Crear cuenta</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>Llena el formulario y únete al juego, po</p>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div className="card" style={{ padding: '28px 24px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inp} required placeholder="Tu nombre" />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} required placeholder="tu@email.com" />
              </div>
              <div>
                <label style={lbl}>Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inp} required placeholder="••••••••" />
              </div>

              <div>
                <label style={lbl}>¿Quién se lleva el Mundial 2026? 🏆</label>
                <select value={championPrediction} onChange={(e) => setChampionPrediction(e.target.value)} style={{ ...inp }} required>
                  <option value="">Selecciona un equipo...</option>
                  {TEAMS.sort().map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 6, margin: '6px 0 0' }}>
                  Si la pegas → +10 puntos bonus al final del torneo
                </p>
              </div>

              <button type="submit" disabled={loading}
                style={{ background: loading ? '#94a3b8' : 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, padding: '11px', fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                {loading ? 'Creando cuenta...' : 'Registrarme al tiro'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Entra aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
