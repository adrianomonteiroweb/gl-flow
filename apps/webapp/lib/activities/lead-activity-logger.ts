import { LeadActivityRepository, type CreateLeadActivityData } from '@workspace/db';

/**
 * Fire-and-forget writer for the lead activity timeline.
 * Mirrors AutomationLogger: never awaited by the caller and never throws,
 * so recording history can't break the main action.
 */
export class LeadActivityLogger {
  static log(data: CreateLeadActivityData): void {
    LeadActivityRepository.log(data).catch(err => {
      console.error('[LeadActivityLogger] Failed to write activity:', err);
    });
  }
}
