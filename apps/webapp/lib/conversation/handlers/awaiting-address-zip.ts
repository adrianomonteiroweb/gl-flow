import type { StateHandler, IncomingMessage, ConversationContext, HandlerResult, ConversationState } from '../types';
import { fetchAddressByZip } from '@/lib/brasilapi';
import { AutomationLogger } from '../audit-logger';
import { buildAddressConfirmationText } from './address-confirmation-message';

const extractZipAndNumber = (text: string): { zip: string; number: string | null } => {
  const zipMatch = text.match(/\d{5}-?\d{3}/);
  if (!zipMatch) return { zip: text.replace(/\D/g, ''), number: null };
  const zip = zipMatch[0].replace(/\D/g, '');
  const after = text.slice(text.indexOf(zipMatch[0]) + zipMatch[0].length).trim();
  const numMatch = after.match(/^[,\-\s]*(\S+)/);
  const candidate = numMatch?.[1] ?? null;
  return { zip, number: candidate && /^\d/.test(candidate) ? candidate : null };
};

export class AwaitingAddressZipHandler implements StateHandler {
  canHandle(state: ConversationState | null): boolean {
    return state === 'AWAITING_ADDRESS_ZIP';
  }

  async handle(msg: IncomingMessage, ctx: ConversationContext): Promise<HandlerResult> {
    const { zip, number } = extractZipAndNumber(msg.text ?? '');

    if (zip.length !== 8) {
      return {
        sendMessages: [{ text: 'CEP inválido. Por favor, envie apenas os 8 números do seu CEP.' }],
      };
    }

    const address = await fetchAddressByZip(zip);

    // CEP not found, or found without a street (common for "CEP geral" of small
    // towns / rural areas). In both cases the lookup can't give us the street —
    // collect it manually (street, then number) before moving on.
    if (!address || !address.street?.trim()) {
      if (!address) {
        AutomationLogger.log({
          workspace_id: ctx.workspace?.id,
          chat_id: ctx.chat.id,
          lead_id: ctx.lead.id,
          event_type: 'FLOW_ERROR',
          payload: { reason: 'brasilapi_not_found', zip },
        });
      }

      const askStreetText = address
        ? 'Encontrei seu CEP! Só preciso que você me diga o nome da sua rua. 🏠'
        : 'Não localizei esse CEP automaticamente, mas podemos seguir pelo endereço. Qual é o nome da sua rua? 🏠';

      return {
        chatPayloadUpdates: {
          collected_zip: zip,
          collected_number: number,
          collected_address_raw: {
            street: '',
            neighborhood: address?.neighborhood ?? '',
            city: address?.city ?? '',
            state: address?.state ?? '',
            zip,
          },
        },
        nextState: 'AWAITING_ADDRESS_STREET',
        cancelFollowUps: true,
        sendMessages: [{ text: askStreetText }],
      };
    }

    if (number) {
      const fullAddress = {
        street: address.street,
        number,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: zip,
      };

      return {
        chatPayloadUpdates: { pending_address: fullAddress },
        nextState: 'AWAITING_ADDRESS_CONFIRMATION',
        cancelFollowUps: true,
        sendMessages: [{ text: buildAddressConfirmationText(fullAddress) }],
      };
    }

    return {
      chatPayloadUpdates: {
        collected_zip: zip,
        collected_address_raw: {
          street: address.street,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zip,
        },
      },
      nextState: 'AWAITING_ADDRESS_NUMBER',
      cancelFollowUps: true,
      sendMessages: [{ text: 'Perfeito! Qual o número do endereço?' }],
    };
  }
}
