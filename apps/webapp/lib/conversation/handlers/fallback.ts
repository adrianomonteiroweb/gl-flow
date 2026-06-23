import type { StateHandler, IncomingMessage, ConversationContext, HandlerResult, ConversationState } from '../types';

export class FallbackHandler implements StateHandler {
  canHandle(_state: ConversationState | null): boolean {
    return true;
  }

  async handle(_msg: IncomingMessage, _ctx: ConversationContext): Promise<HandlerResult> {
    return {
      sendMessages: [{ text: 'Olá! Em breve um de nossos atendentes irá te responder.' }],
    };
  }
}
