import type { StateHandler, IncomingMessage, ConversationContext, HandlerResult, ConversationState } from '../types';

export class BotPausedHandler implements StateHandler {
  canHandle(state: ConversationState | null): boolean {
    return state === 'BOT_PAUSED';
  }

  async handle(_msg: IncomingMessage, _ctx: ConversationContext): Promise<HandlerResult> {
    // Lead responded while agent was handling the chat — cancel any scheduled follow-ups.
    return { cancelFollowUps: true };
  }
}
