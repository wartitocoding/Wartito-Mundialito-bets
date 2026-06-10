'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalMatches: number;
  totalPredictions: number;
  avgAccuracy: number;
  topPredictors: any[];
  recentMatches: any[];
}

export default function AdminPage() {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setIsAuthenticated(true);
      } else {
        alert('Token inválido');
      }
    } catch (err) {
      alert('Error al conectar');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">Admin Panel</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Admin Token</label>
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center mt-4 text-sm text-gray-600">
            Usa el token de .env.local: ADMIN_TOKEN
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">🔧 Admin Panel</h1>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setAdminToken('');
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </nav>

      {stats && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Total Usuarios</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Total Partidos</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalMatches}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Total Predicciones</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalPredictions}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Precisión Promedio</p>
              <p className="text-3xl font-bold text-orange-600">{stats.avgAccuracy}%</p>
            </div>
          </div>

          {/* Top Predictors */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">🏆 Top Predictores</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">#</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Nombre</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Predicciones</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Exactas</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topPredictors.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-6 py-4 text-sm font-bold">{i + 1}</td>
                      <td className="px-6 py-4 text-sm">{p.name}</td>
                      <td className="px-6 py-4 text-sm text-center">{p.totalPredictions}</td>
                      <td className="px-6 py-4 text-sm text-center text-green-600 font-semibold">
                        {p.exactMatches}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-xl font-bold text-blue-600">
                        {p.totalPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">⚙️ Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/admin/users"
                className="bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 text-center"
              >
                👤 Gestionar Usuarios
              </Link>
              <Link
                href="/admin/matches"
                className="bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 text-center"
              >
                ⚽ Gestionar Partidos
              </Link>
              <Link
                href="/admin/predictions"
                className="bg-purple-600 text-white px-4 py-3 rounded hover:bg-purple-700 text-center"
              >
                🎯 Ver Predicciones
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
