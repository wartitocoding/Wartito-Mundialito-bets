import { NextRequest, NextResponse } from 'next/server';
import { syncWorldcupMatches, updateLiveResults } from '@/lib/sync';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Simple auth check - cambiar según necesites
    const adminToken = process.env.ADMIN_TOKEN || 'admin-secret';
    if (token !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type = 'full' } = await req.json().catch(() => ({}));

    let result;

    if (type === 'live') {
      result = await updateLiveResults();
    } else {
      result = await syncWorldcupMatches();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
