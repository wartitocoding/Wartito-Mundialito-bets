import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { createUser, isUserAllowed, createToken, verifyPassword, getUserByEmail } from '@/lib/auth';

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

    if (!isUserAllowed(email)) {
      return NextResponse.json(
        { error: 'Email no autorizado para registrarse' },
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
