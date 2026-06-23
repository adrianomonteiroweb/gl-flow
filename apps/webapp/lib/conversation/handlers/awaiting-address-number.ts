import type { StateHandler, IncomingMessage, ConversationContext, HandlerResult, ConversationState } from '../types';
import { buildAddressConfirmationText } from './address-confirmation-message';

export class AwaitingAddressNumberHandler implements StateHandler {
  canHandle(state: ConversationState | null): boolean {
    return state === 'AWAITING_ADDRESS_NUMBER';
  }

  async handle(msg: IncomingMessage, ctx: ConversationContext): Promise<HandlerResult> {
    const number = msg.text?.trim() ?? '';

    if (!number) {
      return {
        sendMessages: [{ text: 'Por favor, informe o número do seu endereço.' }],
      };
    }

    const payload = ctx.chat.payload as Record<string, unknown> | null;
    const rawAddress = payload?.collected_address_raw as Record<string, string> | undefined;

    const fullAddress = {
      street: rawAddress?.street ?? '',
      number,
      neighborhood: rawAddress?.neighborhood ?? '',
      city: rawAddress?.city ?? '',
      state: rawAddress?.state ?? '',
      zipCode: rawAddress?.zip ?? String(payload?.collected_zip ?? ''),
    };

    return {
      chatPayloadUpdates: { pending_address: fullAddress },
      nextState: 'AWAITING_ADDRESS_CONFIRMATION',
      cancelFollowUps: true,
      sendMessages: [{ text: buildAddressConfirmationText(fullAddress) }],
    };
  }
}
