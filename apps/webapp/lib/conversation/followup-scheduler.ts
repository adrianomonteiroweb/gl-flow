import { db, chat_scheduled_messages_table, FlowConfigRepository, type FlowConfigData } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { FOLLOWUP_STEPS } from '@/utils/followup-message';
import type { ConversationState } from './types';
import { AutomationLogger } from './audit-logger';

type ScheduleParams = {
  chatId: string;
  origin: 'whatsapp' | 'telegram';
  workspaceId?: string | null;
  leadId?: string;
  triggerState?: string;
};

type CancelParams = {
  chatId: string;
  workspaceId?: string | null;
  leadId?: string;
};

// States that automatically cancel all pending follow-ups on transition.
// Any state beyond AWAITING_NAME means the lead is engaged — follow-ups are no longer relevant.
const CANCEL_ON_STATES: ConversationState[] = [
  'AWAITING_ADDRESS_ZIP',
  'AWAITING_ADDRESS_STREET',
  'AWAITING_ADDRESS_NUMBER',
  'AWAITING_ADDRESS_CONFIRMATION',
  'AWAITING_PLAN_SELECTION',
  'QUALIFIED',
  'BOT_PAUSED',
  'CLOSED',
  'INACTIVE',
];

const buildHardcodedSteps = (triggerState: string) =>
  Object.entries(FOLLOWUP_STEPS).map(([order, step]) => ({
    order: Number(order),
    delay_ms: step.delay_ms,
    message: step.message as string | null,
    template_name: null as string | null,
    trigger_state: triggerState,
    cancel_on_states: ['QUALIFIED', 'CLOSED', 'INACTIVE'],
  }));

export class FollowUpScheduler {
  static async scheduleFollowUps(params: ScheduleParams): Promise<void> {
    const { chatId, origin, workspaceId, leadId, triggerState = 'AWAITING_NAME' } = params;

    let steps = buildHardcodedSteps(triggerState);

    if (workspaceId) {
      const flowConfig = await FlowConfigRepository.findActiveByWorkspaceAndFlow(workspaceId, 'onboarding');

      if (flowConfig?.config) {
        const config = flowConfig.config as FlowConfigData;
        const stateSteps = config.steps.filter(s => s.trigger_state === triggerState);
        if (stateSteps.length > 0) {
          steps = stateSteps.map(s => ({
            order: s.order,
            delay_ms: s.delay_ms,
            message: s.message,
            template_name: s.template_name,
            trigger_state: s.trigger_state,
            cancel_on_states: s.cancel_on_states,
          }));
        }
      }
    }

    const now = Date.now();

    for (const step of steps) {
      const scheduledAt = new Date(now + step.delay_ms).toISOString();

      await db
        .insert(chat_scheduled_messages_table)
        .values({
          chat_id: chatId,
          step_order: step.order,
          origin,
          scheduled_at: scheduledAt,
          status: 'pending',
          flow_name: 'onboarding',
          trigger_state: step.trigger_state,
        })
        .onConflictDoUpdate({
          target: [chat_scheduled_messages_table.chat_id, chat_scheduled_messages_table.step_order],
          set: {
            scheduled_at: scheduledAt,
            status: 'pending',
            trigger_state: step.trigger_state,
            flow_name: 'onboarding',
            origin,
            updated_at: new Date().toISOString(),
          },
        });
    }

    AutomationLogger.log({
      workspace_id: workspaceId ?? undefined,
      chat_id: chatId,
      lead_id: leadId,
      event_type: 'FOLLOWUP_SCHEDULED',
      payload: { step_count: steps.length, origin },
    });
  }

  static async cancelFollowUps(params: CancelParams): Promise<void> {
    const { chatId, workspaceId, leadId } = params;

    await db
      .update(chat_scheduled_messages_table)
      .set({ status: 'cancelled', updated_at: new Date().toISOString() })
      .where(
        and(
          eq(chat_scheduled_messages_table.chat_id, chatId),
          eq(chat_scheduled_messages_table.status, 'pending')
        )
      );

    AutomationLogger.log({
      workspace_id: workspaceId ?? undefined,
      chat_id: chatId,
      lead_id: leadId,
      event_type: 'FOLLOWUP_CANCELLED',
      payload: { reason: 'manual_cancel' },
    });
  }

  /** Cancels all pending follow-ups when transitioning to a state that makes them irrelevant. */
  static async cancelFollowUpsForState(params: CancelParams & { convState: ConversationState }): Promise<void> {
    if (CANCEL_ON_STATES.includes(params.convState)) {
      await this.cancelFollowUps(params);
    }
  }
}
