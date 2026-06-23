import { NextRequest, NextResponse } from 'next/server';
import { db, chats_table } from '@workspace/db';
import { isNull, sql } from 'drizzle-orm';
import { and } from 'drizzle-orm';
import { transitionState } from '@/lib/conversation/transitions';
import { FollowUpScheduler } from '@/lib/conversation/followup-scheduler';

// Timeouts per state (ms)
const STATE_TIMEOUTS: Record<string, number> = {
  AWAITING_NAME: 24 * 60 * 60 * 1000,
  AWAITING_ADDRESS_ZIP: 48 * 60 * 60 * 1000,
  AWAITING_ADDRESS_STREET: 48 * 60 * 60 * 1000,
  AWAITING_ADDRESS_NUMBER: 48 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expiredChats = await db
    .select({
      id: chats_table.id,
      conv_state: chats_table.conv_state,
      workspace_id: chats_table.workspace_id,
      lead_id: chats_table.lead_id,
    })
    .from(chats_table)
    .where(
      and(
        isNull(chats_table.done_at),
        sql`${chats_table.conv_state} IN ('AWAITING_NAME', 'AWAITING_ADDRESS_ZIP', 'AWAITING_ADDRESS_STREET', 'AWAITING_ADDRESS_NUMBER')`,
        sql`(
          (${chats_table.conv_state} = 'AWAITING_NAME'
            AND (${chats_table.payload}->>'conv_state_entered_at')::timestamptz < NOW() - INTERVAL '24 hours')
          OR
          (${chats_table.conv_state} IN ('AWAITING_ADDRESS_ZIP', 'AWAITING_ADDRESS_STREET', 'AWAITING_ADDRESS_NUMBER')
            AND (${chats_table.payload}->>'conv_state_entered_at')::timestamptz < NOW() - INTERVAL '48 hours')
        )`
      )
    );

  let timedOut = 0;
  let failed = 0;

  for (const chat of expiredChats) {
    try {
      await transitionState({
        chatId: chat.id,
        fromState: chat.conv_state,
        toState: 'INACTIVE',
        workspaceId: chat.workspace_id,
        leadId: chat.lead_id,
        channel: 'cron',
      });

      await FollowUpScheduler.cancelFollowUps({
        chatId: chat.id,
        workspaceId: chat.workspace_id,
        leadId: chat.lead_id,
      });

      timedOut++;
    } catch (err) {
      console.error(`[cron/automation-timeout] chat=${chat.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ processed: expiredChats.length, timedOut, failed });
}
