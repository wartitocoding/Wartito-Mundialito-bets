'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">⚽ Mundial Bets</h1>
          <div className="space-x-4">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    setIsLoggedIn(false);
                    window.location.href = '/';
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-blue-600">
                  Login
                </Link>
                <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Registro
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-white">
        <h2 className="text-5xl font-bold mb-4">Apuestas en Tiempo Real</h2>
        <p className="text-xl mb-8">Haz predicciones del mundial y compite con tus amigos</p>

        {!isLoggedIn && (
          <div className="space-x-4">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 inline-block"
            >
              Comenzar
            </Link>
            <Link
              href="/login"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white hover:text-blue-600 inline-block"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
