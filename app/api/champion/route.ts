import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { setWorldCupChampion, getWorldCupChampion, updateChampionPoints } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    initDb();
    const champion = getWorldCupChampion(2026);
    return NextResponse.json({ champion, year: 2026 });
  } catch (error) {
    console.error('Get champion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    initDb();

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const adminToken = process.env.ADMIN_TOKEN || 'admin-secret';

    if (token !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { champion, year = 2026 } = await req.json();

    if (!champion) {
      return NextResponse.json(
        { error: 'Champion es requerido' },
        { status: 400 }
      );
    }

    const success = setWorldCupChampion(year, champion);

    if (!success) {
      return NextResponse.json(
        { error: 'Error al establecer el campeón' },
        { status: 500 }
      );
    }

    // Actualizar puntos para todos los usuarios que acertaron
    const updatedCount = updateChampionPoints(year);

    return NextResponse.json({
      success: true,
      champion,
      year,
      usersAwardedPoints: updatedCount,
    });
  } catch (error) {
    console.error('Set champion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
