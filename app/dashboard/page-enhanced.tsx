'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EnhancedDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'matches' | 'ranking' | 'stats' | 'achievements'>('matches');
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState<any>(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchAllData(token);
  }, [router]);

  const fetchAllData = async (token: string) => {
    try {
      const [achievRes, statsRes, notifRes] = await Promise.all([
        fetch('/api/achievements', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (achievRes.ok) {
        setAchievements(await achievRes.json());
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (notifRes.ok) {
        setNotifications(await notifRes.json());
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Notifications Bell */}
      <div className="fixed top-4 right-4 z-50">
        {notifications.length > 0 && (
          <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
            {notifications.filter((n: any) => !n.read).length}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex gap-4">
          {[
            { key: 'matches', label: '⚽ Partidos' },
            { key: 'ranking', label: '📊 Ranking' },
            { key: 'stats', label: '📈 Estadísticas' },
            { key: 'achievements', label: '🏆 Logros' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-4 py-3 font-semibold border-b-2 transition ${
                activeTab === key
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">Total Predicciones</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.overall?.totalPredictions || 0}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">Exactas</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.overall?.exactMatches || 0}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">Tasa de Acierto</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.overall?.successRate || 0}%
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">Racha Actual</p>
                <p className="text-3xl font-bold text-orange-600">
                  🔥 {stats.currentStreak || 0}
                </p>
              </div>
            </div>

            {/* Best Teams */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">⚽ Rendimiento por Equipo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.byTeam?.slice(0, 6).map((team: any) => (
                  <div key={team.team} className="border rounded-lg p-4">
                    <p className="font-bold text-lg">{team.team}</p>
                    <p className="text-sm text-gray-600">
                      {team.predictions} predicciones | {team.winRate}% acciertos
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">🏆 Logros Desbloqueados</h2>

            {achievements.length === 0 ? (
              <div className="bg-white p-8 rounded-lg text-center">
                <p className="text-gray-500">Aún no tienes logros. ¡Comienza a predecir!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement: any) => (
                  <div
                    key={achievement.achievementType}
                    className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-lg p-6"
                  >
                    <p className="text-2xl mb-2">{achievement.info?.name}</p>
                    <p className="text-gray-700 mb-3">{achievement.info?.description}</p>
                    <p className="text-sm text-yellow-700 font-semibold">
                      +{achievement.info?.points} puntos
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
