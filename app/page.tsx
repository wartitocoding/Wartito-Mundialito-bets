'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);

  return (
    <div style={{ background: 'var(--surface)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--navy)', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚽</span>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>
              Wartito Mundialito <span style={{ color: '#60a5fa' }}>Bets</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" style={{ color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>Dashboard</Link>
                <button onClick={() => { localStorage.removeItem('token'); setIsLoggedIn(false); }}
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link href="/login" style={{ color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>Iniciar sesión</Link>
                <Link href="/register" style={{ background: '#2563eb', color: 'white', padding: '7px 18px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: 'var(--navy)', paddingBottom: 64 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 999, padding: '4px 14px', marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
            <span style={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mundial 2026 · USA / Canada / México</span>
          </div>
          <h1 style={{ color: 'white', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 18px' }}>
            Predicciones del<br /><span style={{ color: '#60a5fa' }}>Mundial 2026</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: 500, lineHeight: 1.7, margin: '0 0 32px' }}>
            Apostá resultados partido a partido, elegí al campeón y competí contra tus amigos en el ranking general.
          </p>
          {!isLoggedIn ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/register" style={{ background: '#2563eb', color: 'white', padding: '11px 26px', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}>
                Empezar ahora →
              </Link>
              <Link href="/login" style={{ background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', padding: '11px 26px', borderRadius: 10, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
                Ya tengo cuenta
              </Link>
            </div>
          ) : (
            <Link href="/dashboard" style={{ background: '#2563eb', color: 'white', padding: '11px 26px', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', display: 'inline-block' }}>
              Ir al Dashboard →
            </Link>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex' }}>
          {[{ v: '64', l: 'Partidos' }, { v: '12', l: 'Grupos' }, { v: '3 pts', l: 'Resultado exacto' }, { v: '10 pts', l: 'Bonus campeón' }].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '22px 0', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--navy)', letterSpacing: '-0.02em' }}>{s.v}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ marginBottom: 36 }}>
          <span className="tag" style={{ marginBottom: 12, display: 'inline-block' }}>Cómo funciona</span>
          <h2 style={{ fontWeight: 800, fontSize: '1.7rem', letterSpacing: '-0.02em', margin: 0, color: 'var(--navy)' }}>Tres pasos para competir</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { n: '01', icon: '🎯', title: 'Predecí resultados', desc: 'Antes de cada partido, ingresá el marcador que creés que va a terminar.' },
            { n: '02', icon: '🏆', title: 'Elegí al campeón', desc: 'Al registrarte elegís el campeón del mundo. Si acertás sumás 10 puntos extra al final.' },
            { n: '03', icon: '📊', title: 'Seguí el ranking', desc: 'El ranking se actualiza en tiempo real. Mirá quién lidera y cuánto te falta para alcanzarlo.' },
          ].map((f) => (
            <div key={f.n} className="card" style={{ padding: '28px 24px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', letterSpacing: '0.08em', marginBottom: 16, background: '#eff6ff', display: 'inline-block', padding: '3px 10px', borderRadius: 6 }}>{f.n}</div>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 8px', color: 'var(--navy)' }}>{f.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center', background: 'white' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: 0 }}>Wartito Mundialito Bets 2026 · Solo para uso privado entre amigos</p>
      </div>
    </div>
  );
}
