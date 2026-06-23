import type { StateHandler, IncomingMessage, ConversationContext, HandlerResult, ConversationState } from '../types';
import type { AvailableProduct } from '@/lib/products';
import { buildPlanConfirmationMessage } from './plan-messages';
import { ChatRepository } from '@/repositories/ChatRepository';

export class AwaitingPlanSelectionHandler implements StateHandler {
  canHandle(state: ConversationState | null): boolean {
    return state === 'AWAITING_PLAN_SELECTION';
  }

  async handle(msg: IncomingMessage, ctx: ConversationContext): Promise<HandlerResult> {
    const raw = msg.text?.trim() ?? '';
    const payload = ctx.chat.payload as Record<string, unknown> | null;
    const products = payload?.available_plans as AvailableProduct[] | undefined;

    if (!products || products.length === 0) {
      console.error('[AwaitingPlanSelection] Produtos ausentes no payload — lead:', ctx.lead.id);
      await ChatRepository.updateStepBySlug(ctx.chat.id, ctx.workspace?.id, 'qualified', 'qualificado');
      return {
        chatUpdates: { step: 'qualified' },
        chatPayloadUpdates: { available_plans: null },
        nextState: 'BOT_PAUSED',
        cancelFollowUps: true,
        sendMessages: [{ text: 'Houve um problema ao carregar os planos. Nossa equipe entrará em contato em breve.' }],
      };
    }

    const selection = parseInt(raw, 10);

    if (isNaN(selection) || selection < 1 || selection > products.length) {
      return {
        sendMessages: [{
          text: `Por favor, digite apenas o *número* do plano desejado (de *1* a *${products.length}*).`,
        }],
      };
    }

    const selectedProduct = products[selection - 1]!;

    console.log('[AwaitingPlanSelection] Produto selecionado — lead:', ctx.lead.id, '— plano:', selectedProduct.name, '— valor:', selectedProduct.base_price);

    await ChatRepository.updateStepBySlug(ctx.chat.id, ctx.workspace?.id, 'negotiation', 'negociacao_iniciada');

    return {
      leadUpdates: { selected_plan: selectedProduct },
      chatUpdates: { step: 'negotiation' },
      chatPayloadUpdates: { available_plans: null, selected_plan: selectedProduct },
      nextState: 'BOT_PAUSED',
      cancelFollowUps: true,
      sendMessages: [{ text: buildPlanConfirmationMessage(selectedProduct) }],
    };
  }
}
