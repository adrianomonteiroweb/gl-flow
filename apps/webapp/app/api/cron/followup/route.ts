import { NextRequest, NextResponse } from 'next/server';
import { runFollowupCron } from '@/lib/cron/followup';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runFollowupCron();
  return NextResponse.json(result);
}
