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
    if (!token) {
      router.push('/login');
      return;
    }

    fetchData(token);

    // Actualizar cada 10 segundos para tiempo real
    const interval = setInterval(() => fetchData(token), 10000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      const [matchesRes, rankingsRes, predictionsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/rankings'),
        fetch('/api/predictions', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!matchesRes.ok || !rankingsRes.ok || !predictionsRes.ok) {
        throw new Error('Error fetching data');
      }

      const matchesData = await matchesRes.json();
      const rankingsData = await rankingsRes.json();
      const predictionsData = await predictionsRes.json();

      setMatches(matchesData);
      setRankings(rankingsData);
      setPredictions(predictionsData);
      setLoading(false);

      // Set user from first ranking entry
      if (rankingsData.length > 0) {
        setUser({
          name: rankingsData[0].name,
          email: rankingsData[0].email,
          championPrediction: rankingsData[0].championPrediction,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      localStorage.removeItem('token');
      router.push('/login');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  const nextMatches = matches.filter((m) => new Date(m.date) > new Date());
  const finishedMatches = matches.filter((m) => m.result1 !== null);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">⚽ Mundial Bets</h1>
          <div className="space-x-4 flex items-center">
            <div className="text-right">
              <p className="text-gray-700 font-semibold">Hola, {user?.name}</p>
              {user?.championPrediction && (
                <p className="text-sm text-blue-600">
                  🏆 {user.championPrediction}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                router.push('/');
              }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex border-b mb-6">
          {(['matches', 'ranking', 'my-predictions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'matches' && 'Partidos'}
              {tab === 'ranking' && 'Ranking'}
              {tab === 'my-predictions' && 'Mis Apuestas'}
            </button>
          ))}
        </div>

        {activeTab === 'matches' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Próximos Partidos</h2>
            <div className="grid gap-4">
              {nextMatches.length === 0 ? (
                <p className="text-gray-600">No hay partidos próximos</p>
              ) : (
                nextMatches.map((match) => {
                  const userPrediction = predictions.find((p) => p.matchId === match.id);
                  return (
                    <div key={match.id} className="bg-white p-4 rounded-lg shadow">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">{match.stage}</p>
                          <p className="text-lg font-bold">
                            {match.team1} vs {match.team2}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(match.date).toLocaleString('es-ES')}
                          </p>
                        </div>

                        <div className="text-center mr-4">
                          {userPrediction ? (
                            <div>
                              <p className="text-2xl font-bold">
                                {userPrediction.prediction1} - {userPrediction.prediction2}
                              </p>
                              <p className="text-sm text-green-600 font-semibold">
                                Tu predicción
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Sin predicción</p>
                          )}
                        </div>

                        <Link
                          href={`/predict/${match.id}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          {userPrediction ? 'Editar' : 'Apostar'}
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Ranking</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-center">🏆 Campeón</th>
                    <th className="px-4 py-3 text-center">Partidos</th>
                    <th className="px-4 py-3 text-center">Pts Partidos</th>
                    <th className="px-4 py-3 text-center">Pts Campeón</th>
                    <th className="px-4 py-3 text-center">Total Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((rank, index) => (
                    <tr key={rank.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 font-bold text-lg">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold">{rank.name}</td>
                      <td className="px-4 py-3 text-center text-sm">{rank.championPrediction}</td>
                      <td className="px-4 py-3 text-center">{rank.totalPredictions || 0}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-semibold">
                        {rank.matchPoints || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-yellow-600 font-semibold">
                        {rank.championPoints || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-xl font-bold text-blue-600">
                        {rank.totalPoints || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-900 mb-2">Sistema de Puntos:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>🎯 <strong>Partidos:</strong> 3 pts (resultado exacto) | 1 pt (solo ganador)</li>
                <li>🏆 <strong>Campeón:</strong> 10 puntos si aciertas quién gana el mundial</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'my-predictions' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Mis Apuestas</h2>
            {finishedMatches.length === 0 ? (
              <p className="text-gray-600">No hay partidos jugados aún</p>
            ) : (
              <div className="grid gap-4">
                {finishedMatches.map((match) => {
                  const prediction = predictions.find((p) => p.matchId === match.id);
                  const isCorrect =
                    prediction &&
                    prediction.prediction1 === match.result1 &&
                    prediction.prediction2 === match.result2;

                  return (
                    <div
                      key={match.id}
                      className={`p-4 rounded-lg ${
                        isCorrect ? 'bg-green-50 border-2 border-green-500' : 'bg-white shadow'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-lg font-bold">
                            {match.team1} vs {match.team2}
                          </p>
                          <div className="flex gap-8 mt-2">
                            {prediction ? (
                              <>
                                <div>
                                  <p className="text-sm text-gray-600">Tu predicción</p>
                                  <p className="text-xl font-bold">
                                    {prediction.prediction1} - {prediction.prediction2}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Resultado real</p>
                                  <p className="text-xl font-bold">
                                    {match.result1} - {match.result2}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">No hiciste predicción</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Puntos</p>
                          <p className={`text-3xl font-bold ${isCorrect ? 'text-green-600' : 'text-gray-400'}`}>
                            {prediction?.points || 0}
                          </p>
                        </div>
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
