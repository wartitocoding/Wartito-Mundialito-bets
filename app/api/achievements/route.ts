import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getUserAchievements, checkAndAwardAchievements, ACHIEVEMENT_INFO } from '@/lib/achievements';
import { verifyAuth } from '@/lib/middleware';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const achievements = getUserAchievements(auth.userId);
    const withInfo = achievements.map((a: any) => ({
      ...a,
      info: ACHIEVEMENT_INFO[a.achievementType as keyof typeof ACHIEVEMENT_INFO],
    }));

    return NextResponse.json(withInfo);
  } catch (error) {
    console.error('Achievements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    initDb();
    const auth = verifyAuth(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check and award achievements
    const awarded = checkAndAwardAchievements(auth.userId);

    return NextResponse.json({
      message: 'Achievements checked',
      awarded,
      total: getUserAchievements(auth.userId).length,
    });
  } catch (error) {
    console.error('Check achievements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
