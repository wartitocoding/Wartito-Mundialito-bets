import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getUserByEmail, verifyPassword, createToken } from '@/lib/auth';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    initDb();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y password son requeridos' },
        { status: 400 }
      );
    }

    const user = getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    const token = createToken(user.id);

    return NextResponse.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
