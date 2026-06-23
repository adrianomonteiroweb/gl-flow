import type { StateHandler, IncomingMessage, ConversationContext, HandlerResult, ConversationState } from '../types';
import { buildAddressConfirmationText } from './address-confirmation-message';
import { checkViability } from '@/lib/voalle';
import { getAvailableProducts } from '@/lib/products';
import { buildPlansListMessage } from './plan-messages';
import { ChatRepository } from '@/repositories/ChatRepository';

type PendingAddress = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
};

const POSITIVE_RESPONSES = new Set([
  'sim', 's', 'yes', 'correto', 'certo', 'confirmo', 'ok', '1',
  'isso', 'exato', 'perfeito', 'confirmado',
]);

const NEGATIVE_RESPONSES = new Set([
  'não', 'nao', 'n', 'no', 'errado', 'incorreto', 'trocar',
  'mudar', '2', 'outro', 'diferente',
]);

export class AwaitingAddressConfirmationHandler implements StateHandler {
  canHandle(state: ConversationState | null): boolean {
    return state === 'AWAITING_ADDRESS_CONFIRMATION';
  }

  async handle(msg: IncomingMessage, ctx: ConversationContext): Promise<HandlerResult> {
    const raw = msg.text?.trim().toLowerCase() ?? '';
    const payload = ctx.chat.payload as Record<string, unknown> | null;
    const pending = payload?.pending_address as PendingAddress | null | undefined;

    if (!pending) {
      return {
        nextState: 'AWAITING_ADDRESS_ZIP',
        sendMessages: [{ text: 'Ocorreu um problema. Poderia informar seu CEP novamente (apenas os 8 números)?' }],
      };
    }

    if (POSITIVE_RESPONSES.has(raw)) {
      console.log('[AwaitingAddressConfirmation] Endereço confirmado — lead:', ctx.lead.id, pending);
      console.log('[AwaitingAddressConfirmation] Iniciando consulta de viabilidade na Voalle...');

      const result = await checkViability(pending, ctx.workspace?.id ?? ctx.lead.workspace_id ?? undefined);

      console.log('[AwaitingAddressConfirmation] Resposta da Voalle:', result);

      if (!result.success) {
        console.error('[AwaitingAddressConfirmation] Falha na consulta — lead:', ctx.lead.id, '— erro:', result.error);
        await ChatRepository.setStatusBySlug(ctx.chat.id, ctx.workspace?.id, 'em_atendimento');
        return {
          leadUpdates: { address: pending },
          chatUpdates: { step: 'qualified' },
          chatPayloadUpdates: { pending_address: null },
          nextState: 'BOT_PAUSED',
          cancelFollowUps: true,
          sendMessages: [
            { text: 'Estamos consultando a viabilidade para o seu endereço 🔍 Só um momento por favor!' },
            { text: 'Houve um problema ao consultar a viabilidade. Nossa equipe entrará em contato em breve.' },
          ],
        };
      }

      if (result.viable) {
        console.log('[AwaitingAddressConfirmation] Viabilidade POSITIVA — lead:', ctx.lead.id, '— CTOs:', result.ctos, '— portas:', result.ports);

        const workspaceId = ctx.workspace?.id ?? ctx.lead.workspace_id ?? '';
        const productsResult = await getAvailableProducts(workspaceId, pending.city);

        if (productsResult.success && productsResult.products.length > 0) {
          console.log('[AwaitingAddressConfirmation] Produtos encontrados:', productsResult.products.length, '— lead:', ctx.lead.id);
          await ChatRepository.updateStepBySlug(ctx.chat.id, ctx.workspace?.id, 'qualified', 'qualificado');
          const planMessages = buildPlansListMessage(productsResult.products);

          return {
            leadUpdates: { address: pending },
            chatUpdates: { step: 'qualified' },
            chatPayloadUpdates: {
              pending_address: null,
              available_plans: productsResult.products,
            },
            nextState: 'AWAITING_PLAN_SELECTION',
            cancelFollowUps: true,
            sendMessages: [
              { text: 'Estamos consultando a viabilidade para o seu endereço 🔍 Só um momento por favor!' },
              ...planMessages.map(text => ({ text })),
            ],
          };
        }

        console.log('[AwaitingAddressConfirmation] Viável mas sem produtos disponíveis — lead:', ctx.lead.id,
          productsResult.success ? 'nenhum produto na cidade' : productsResult.error);

        await ChatRepository.updateStepBySlug(ctx.chat.id, ctx.workspace?.id, 'qualified', 'qualificado');
        return {
          leadUpdates: { address: pending },
          chatUpdates: { step: 'qualified' },
          chatPayloadUpdates: { pending_address: null },
          nextState: 'BOT_PAUSED',
          cancelFollowUps: true,
          sendMessages: [
            { text: 'Estamos consultando a viabilidade para o seu endereço 🔍 Só um momento por favor!' },
            { text: 'Ótima notícia! 🎉 Seu endereço tem viabilidade técnica para instalação. Em breve nossa equipe entrará em contato para concluir seu atendimento.' },
          ],
        };
      }

      console.log('[AwaitingAddressConfirmation] Viabilidade NEGATIVA — lead:', ctx.lead.id);
      await ChatRepository.setStatusBySlug(ctx.chat.id, ctx.workspace?.id, 'sem_viabilidade');
      return {
        leadUpdates: { address: pending },
        chatUpdates: { step: 'qualified' },
        chatPayloadUpdates: { pending_address: null },
        nextState: 'BOT_PAUSED',
        cancelFollowUps: true,
        sendMessages: [
          { text: 'Estamos consultando a viabilidade para o seu endereço 🔍 Só um momento por favor!' },
          { text: 'Infelizmente ainda não temos cobertura para o seu endereço. 😕 Assim que chegarmos na sua região, entraremos em contato!' },
        ],
      };
    }

    if (NEGATIVE_RESPONSES.has(raw)) {
      return {
        chatPayloadUpdates: { pending_address: null, collected_address_raw: null, collected_zip: null, collected_number: null },
        nextState: 'AWAITING_ADDRESS_ZIP',
        cancelFollowUps: true,
        sendMessages: [{ text: 'Sem problema! Por favor, informe seu CEP novamente (apenas os 8 números).' }],
      };
    }

    return {
      sendMessages: [{ text: `Não entendi sua resposta. ${buildAddressConfirmationText(pending)}` }],
    };
  }
}
