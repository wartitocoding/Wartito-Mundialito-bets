'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
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

    if (!championPrediction) {
      setError('Debes seleccionar al campeón predicho');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, championPrediction }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error en el registro');
        return;
      }

      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Registro</h1>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              🏆 ¿Quién será el campeón del mundial?
            </label>
            <select
              value={championPrediction}
              onChange={(e) => setChampionPrediction(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
              required
            >
              <option value="">Selecciona un equipo...</option>
              {TEAMS.sort().map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Recibirás 10 puntos adicionales si aciertas
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="text-center mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
