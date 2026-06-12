import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { createUser, createToken, getUserByEmail, isUserAllowed } from '@/lib/auth';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    initDb();

    const { email, password, name, championPrediction } = await req.json();

    if (!email || !password || !name || !championPrediction) {
      return NextResponse.json(
        { error: 'Email, password, nombre y predicción de campeón son requeridos' },
        { status: 400 }
      );
    }

    // Whitelist: solo emails autorizados pueden registrarse (juego privado).
    // Las cuentas las crea el organizador (admin); el registro abierto queda cerrado.
    if (!isUserAllowed(email)) {
      return NextResponse.json(
        { error: 'Tu email no está autorizado. Pídele al organizador que te cree la cuenta.' },
        { status: 403 }
      );
    }

    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    const success = createUser(email, password, name, championPrediction);

    if (!success) {
      return NextResponse.json(
        { error: 'Error al crear el usuario' },
        { status: 500 }
      );
    }

    const user = getUserByEmail(email);
    const token = createToken(user.id);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        championPrediction: user.championPrediction
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
