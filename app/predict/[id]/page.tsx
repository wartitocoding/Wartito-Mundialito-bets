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
    if (!token) {
      router.push('/login');
      return;
    }

    fetchMatch();
  }, [matchId, router]);

  const fetchMatch = async () => {
    try {
      const res = await fetch('/api/matches');
      if (!res.ok) throw new Error('Error fetching matches');

      const matches = await res.json();
      const found = matches.find((m: Match) => m.id === parseInt(matchId));

      if (!found) {
        throw new Error('Match not found');
      }

      setMatch(found);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchId: parseInt(matchId),
          prediction1,
          prediction2,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al guardar la predicción');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  if (!match) {
    return <div>Partido no encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Volver al Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-2">Haz tu predicción</h1>

          <div className="mb-8">
            <p className="text-gray-600 mb-4">{match.stage}</p>
            <div className="flex items-center justify-around mb-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold">{match.team1}</h2>
              </div>
              <div className="text-3xl font-bold text-gray-400">VS</div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">{match.team2}</h2>
              </div>
            </div>
            <p className="text-gray-600 text-center">
              {new Date(match.date).toLocaleString('es-ES')}
            </p>
          </div>

          {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-gray-700 font-semibold mb-4">¿Cuál es tu predicción?</p>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Goles {match.team1}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={prediction1}
                    onChange={(e) => setPrediction1(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 text-3xl text-center border-2 border-blue-300 rounded focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="text-3xl font-bold text-gray-400">-</div>

                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Goles {match.team2}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={prediction2}
                    onChange={(e) => setPrediction2(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 text-3xl text-center border-2 border-blue-300 rounded focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar Predicción'}
              </button>
              <Link
                href="/dashboard"
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded font-bold hover:bg-gray-400 text-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
