import type { StateHandler, IncomingMessage, ConversationContext, HandlerResult, ConversationState } from '../types';
import { checkViability } from '@/lib/voalle';
import { getAvailableProducts } from '@/lib/products';
import { buildPlansListMessage } from './plan-messages';
import { ChatRepository } from '@/repositories/ChatRepository';

type AddressData = {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

export class QualifiedHandler implements StateHandler {
  canHandle(state: ConversationState | null): boolean {
    return state === 'QUALIFIED';
  }

  async handle(_msg: IncomingMessage, ctx: ConversationContext): Promise<HandlerResult> {
    const address = ctx.lead.address as AddressData | null;

    console.log('[QualifiedHandler] Endereço do lead:', ctx.lead.id, address);

    if (
      !address?.street ||
      !address?.number ||
      !address?.neighborhood ||
      !address?.city ||
      !address?.state ||
      !address?.zipCode
    ) {
      console.warn('[QualifiedHandler] Endereço incompleto — lead:', ctx.lead.id, '— campos faltando:', {
        street: !!address?.street,
        number: !!address?.number,
        neighborhood: !!address?.neighborhood,
        city: !!address?.city,
        state: !!address?.state,
        zipCode: !!address?.zipCode,
      });
      await ChatRepository.setStatusBySlug(ctx.chat.id, ctx.workspace?.id, 'em_atendimento');
      return {
        nextState: 'BOT_PAUSED',
        sendMessages: [{ text: 'Não conseguimos verificar seu endereço. Nossa equipe entrará em contato em breve.' }],
      };
    }

    console.log('[QualifiedHandler] Iniciando consulta de viabilidade para lead:', ctx.lead.id, {
      street: address.street,
      number: address.number,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    });

    const result = await checkViability(
      {
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      },
      ctx.workspace?.id ?? ctx.lead.workspace_id ?? undefined
    );

    console.log('[QualifiedHandler] Resposta da Voalle:', result);

    if (!result.success) {
      console.error('[QualifiedHandler] Falha na consulta de viabilidade — lead:', ctx.lead.id, '— erro:', result.error);
      await ChatRepository.setStatusBySlug(ctx.chat.id, ctx.workspace?.id, 'em_atendimento');
      return {
        nextState: 'BOT_PAUSED',
        sendMessages: [{ text: 'Houve um problema ao consultar a viabilidade. Nossa equipe entrará em contato em breve.' }],
      };
    }

    if (result.viable) {
      console.log('[QualifiedHandler] Viabilidade POSITIVA — lead:', ctx.lead.id, '— CTOs:', result.ctos, '— portas:', result.ports);

      const workspaceId = ctx.workspace?.id ?? ctx.lead.workspace_id ?? '';
      const productsResult = await getAvailableProducts(workspaceId, address.city);

      if (productsResult.success && productsResult.products.length > 0) {
        console.log('[QualifiedHandler] Produtos encontrados:', productsResult.products.length, '— lead:', ctx.lead.id);
        await ChatRepository.setStatusBySlug(ctx.chat.id, ctx.workspace?.id, 'viavel_tecnicamente');
        const planMessages = buildPlansListMessage(productsResult.products);

        return {
          chatPayloadUpdates: { available_plans: productsResult.products },
          nextState: 'AWAITING_PLAN_SELECTION',
          cancelFollowUps: true,
          sendMessages: planMessages.map(text => ({ text })),
        };
      }

      console.log('[QualifiedHandler] Viável mas sem produtos disponíveis — lead:', ctx.lead.id,
        productsResult.success ? 'nenhum produto na cidade' : productsResult.error);

      await ChatRepository.setStatusBySlug(ctx.chat.id, ctx.workspace?.id, 'viavel_tecnicamente');
      return {
        nextState: 'BOT_PAUSED',
        cancelFollowUps: true,
        sendMessages: [{ text: 'Ótima notícia! 🎉 Seu endereço tem viabilidade técnica para instalação. Em breve nossa equipe entrará em contato para concluir seu atendimento.' }],
      };
    }

    console.log('[QualifiedHandler] Viabilidade NEGATIVA — lead:', ctx.lead.id);
    await ChatRepository.setStatusBySlug(ctx.chat.id, ctx.workspace?.id, 'sem_viabilidade');
    return {
      nextState: 'BOT_PAUSED',
      cancelFollowUps: true,
      sendMessages: [{ text: 'Infelizmente ainda não temos cobertura para o seu endereço. 😕 Assim que chegarmos na sua região, entraremos em contato!' }],
    };
  }
}
