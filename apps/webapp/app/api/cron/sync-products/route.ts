import { NextRequest, NextResponse } from 'next/server';
import { runSyncProductsCron } from '@/lib/cron/sync-products';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runSyncProductsCron();
  return NextResponse.json(result);
}
