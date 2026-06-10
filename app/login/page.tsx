'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error en el login'); return; }
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch {
      setError('Error al conectar con el servidor');
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
          <span style={{ color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>Mundialito <span style={{ color: '#60a5fa' }}>Bets</span></span>
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em', margin: '0 0 6px', color: 'var(--navy)' }}>Iniciar sesión</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>Ingresá tus datos para continuar</p>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div className="card" style={{ padding: '28px 24px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} required placeholder="tu@email.com" />
              </div>
              <div>
                <label style={lbl}>Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inp} required placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                style={{ background: loading ? '#94a3b8' : 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, padding: '11px', fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4, transition: 'background 0.2s' }}>
                {loading ? 'Iniciando...' : 'Entrar'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--muted)' }}>
            ¿No tenés cuenta?{' '}
            <Link href="/register" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Registrarse</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
