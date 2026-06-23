import { LeadRepository } from '@/repositories/LeadRepository';
import { ChatRepository } from '@/repositories/ChatRepository';
import { buildWelcomeMessage } from '@/utils/welcome-message';

import type { IncomingMessage, ConversationContext, ConversationResult, ConversationState } from './types';
import { handlers } from './handlers';
import { transitionState } from './transitions';
import { ResponseSender } from './sender';
import { FollowUpScheduler } from './followup-scheduler';

export class ConversationEngine {
  static async processMessage(msg: IncomingMessage, ctx: ConversationContext): Promise<ConversationResult> {
    try {
      await ChatRepository.markInProgressIfPending(ctx.chat.id, ctx.workspace?.id, ctx.chat.status);

      if (ctx.chatCreated && ctx.leadCreated) {
        await ResponseSender.send({
          channel: msg.channel,
          to: msg.from,
          chatId: ctx.chat.id,
          text: buildWelcomeMessage(ctx.lead.name),
          waNumber: ctx.waNumber,
          telegramBotToken: ctx.telegramBotToken,
        });

        await FollowUpScheduler.scheduleFollowUps({
          chatId: ctx.chat.id,
          origin: msg.channel,
          workspaceId: ctx.workspace?.id ?? null,
          leadId: ctx.lead.id,
        });

        return { handled: true };
      }

      const effectiveState = ctx.chat.conv_state as ConversationState | null;

      const handler = handlers.find(h => h.canHandle(effectiveState)) ?? handlers[handlers.length - 1]!;

      const result = await handler.handle(msg, ctx);

      if (result.leadUpdates && Object.keys(result.leadUpdates).length > 0) {
        await LeadRepository.update(ctx.lead.id, result.leadUpdates);
      }

      if (result.chatUpdates?.step) {
        await ChatRepository.updateStepBySlug(ctx.chat.id, ctx.workspace?.id, result.chatUpdates.step as string);
      }

      const SCHEDULE_FOLLOWUPS_ON: string[] = [
        'AWAITING_ADDRESS_ZIP',
        'AWAITING_ADDRESS_STREET',
        'AWAITING_ADDRESS_NUMBER',
        'AWAITING_ADDRESS_CONFIRMATION',
        'AWAITING_PLAN_SELECTION',
        'QUALIFIED',
      ];

      if (result.nextState) {
        await transitionState({
          chatId: ctx.chat.id,
          fromState: ctx.chat.conv_state,
          toState: result.nextState,
          workspaceId: ctx.workspace?.id,
          leadId: ctx.lead.id,
          channel: msg.channel,
          payloadUpdates: result.chatPayloadUpdates,
        });

        if (result.cancelFollowUps) {
          await FollowUpScheduler.cancelFollowUps({
            chatId: ctx.chat.id,
            workspaceId: ctx.workspace?.id,
            leadId: ctx.lead.id,
          });
        }

        if (SCHEDULE_FOLLOWUPS_ON.includes(result.nextState)) {
          await FollowUpScheduler.scheduleFollowUps({
            chatId: ctx.chat.id,
            origin: msg.channel,
            workspaceId: ctx.workspace?.id ?? null,
            leadId: ctx.lead.id,
            triggerState: result.nextState,
          });
        }
      }

      if (result.sendMessages?.length) {
        for (const message of result.sendMessages) {
          await ResponseSender.send({
            channel: msg.channel,
            to: msg.from,
            chatId: ctx.chat.id,
            text: message.text,
            waNumber: ctx.waNumber,
            telegramBotToken: ctx.telegramBotToken,
            templateName: message.templateName,
          });
        }
      }

      return { handled: true };
    } catch (error) {
      console.error('[ConversationEngine] Error processing message:', error);
      return {
        handled: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
