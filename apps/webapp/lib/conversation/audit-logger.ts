import { AutomationLogRepository, type CreateAutomationLogData } from '@workspace/db';

export class AutomationLogger {
  static log(data: CreateAutomationLogData): void {
    AutomationLogRepository.log(data).catch(err => {
      console.error('[AutomationLogger] Failed to write log:', err);
    });
  }
}
