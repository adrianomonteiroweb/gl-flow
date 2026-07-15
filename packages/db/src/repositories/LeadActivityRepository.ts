import { desc, eq } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { lead_activities_table } from '../schema';

export type LeadActivityType =
  | 'lead_created'
  | 'info_updated'
  | 'address_updated'
  | 'loss_reason_set'
  | 'loss_reason_cleared'
  | 'status_changed'
  | 'step_changed'
  | 'assignee_changed'
  | 'lead_taken'
  | 'lead_won'
  | 'lead_closed'
  | 'lead_reactivated'
  | 'note_added'
  | 'chat_won'
  | 'chat_closed'
  | 'task_created'
  | 'task_completed'
  | 'task_reopened'
  | 'task_updated'
  | 'task_deleted'
  | 'proposal_created';

export type LeadActorType = 'user' | 'system';

export type CreateLeadActivityData = {
  workspace_id?: string | null;
  lead_id: string;
  type: LeadActivityType;
  actor_type: LeadActorType;
  actor_id?: string | null;
  actor_name?: string | null;
  description?: string | null;
  payload?: unknown;
  metadata?: Record<string, unknown> | null;
};

export class LeadActivityRepository extends BaseRepository {
  static override model: any = lead_activities_table;

  static async findByLeadId(leadId: string) {
    return await this.db
      .select()
      .from(lead_activities_table)
      .where(eq(lead_activities_table.lead_id, leadId))
      .orderBy(desc(lead_activities_table.created_at));
  }

  /** Append a timeline entry. Used by the fire-and-forget LeadActivityLogger. */
  static async log(data: CreateLeadActivityData) {
    return await this.create(data);
  }
}

export default LeadActivityRepository;
