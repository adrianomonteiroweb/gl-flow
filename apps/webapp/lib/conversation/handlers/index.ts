import type { StateHandler } from '../types';
import { BotPausedHandler } from './bot-paused';
import { AwaitingNameHandler } from './awaiting-name';
import { AwaitingAddressZipHandler } from './awaiting-address-zip';
import { AwaitingAddressStreetHandler } from './awaiting-address-street';
import { AwaitingAddressNumberHandler } from './awaiting-address-number';
import { AwaitingAddressConfirmationHandler } from './awaiting-address-confirmation';
import { AwaitingPlanSelectionHandler } from './awaiting-plan-selection';
import { QualifiedHandler } from './qualified';
import { FallbackHandler } from './fallback';

export const handlers: StateHandler[] = [
  new BotPausedHandler(),
  new AwaitingNameHandler(),
  new AwaitingAddressZipHandler(),
  new AwaitingAddressStreetHandler(),
  new AwaitingAddressNumberHandler(),
  new AwaitingAddressConfirmationHandler(),
  new AwaitingPlanSelectionHandler(),
  new QualifiedHandler(),
  new FallbackHandler(), // must be last — catches any unmapped state
];
