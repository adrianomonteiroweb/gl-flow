import type { StateHandler, IncomingMessage, ConversationContext, HandlerResult, ConversationState } from '../types';
import { buildAddressConfirmationText } from './address-confirmation-message';

export class AwaitingAddressStreetHandler implements StateHandler {
  canHandle(state: ConversationState | null): boolean {
    return state === 'AWAITING_ADDRESS_STREET';
  }

  async handle(msg: IncomingMessage, ctx: ConversationContext): Promise<HandlerResult> {
    const street = msg.text?.trim() ?? '';

    if (!street) {
      return {
        sendMessages: [{ text: 'Por favor, informe o nome da sua rua.' }],
      };
    }

    const payload = ctx.chat.payload as Record<string, unknown> | null;
    const rawAddress: Record<string, string> = (payload?.collected_address_raw as Record<string, string> | undefined) ?? {};
    const zip = rawAddress.zip ?? String(payload?.collected_zip ?? '');

    const updatedAddress: Record<string, string> = { ...rawAddress, street, zip };

    // The number may have come bundled with the CEP (e.g. "12345678 100"); in that
    // case skip the number question and go straight to confirmation.
    const collectedNumber = payload?.collected_number;

    if (typeof collectedNumber === 'string' && collectedNumber.trim()) {
      const fullAddress = {
        street,
        number: collectedNumber.trim(),
        neighborhood: updatedAddress.neighborhood ?? '',
        city: updatedAddress.city ?? '',
        state: updatedAddress.state ?? '',
        zipCode: zip,
      };

      return {
        chatPayloadUpdates: {
          collected_address_raw: updatedAddress,
          collected_number: null,
          pending_address: fullAddress,
        },
        nextState: 'AWAITING_ADDRESS_CONFIRMATION',
        cancelFollowUps: true,
        sendMessages: [{ text: buildAddressConfirmationText(fullAddress) }],
      };
    }

    return {
      chatPayloadUpdates: { collected_address_raw: updatedAddress },
      nextState: 'AWAITING_ADDRESS_NUMBER',
      cancelFollowUps: true,
      sendMessages: [{ text: 'Perfeito! Qual o número do endereço?' }],
    };
  }
}
