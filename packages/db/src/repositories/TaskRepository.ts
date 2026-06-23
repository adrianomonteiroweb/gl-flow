import { and, asc, eq, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { tasks_table } from '../schema';

export class TaskRepository extends BaseRepository {
  static override model: any = tasks_table;

  static async findAllByLead(leadId: string) {
    return await this.db
      .select()
      .from(tasks_table)
      .where(and(eq(tasks_table.lead_id, leadId), isNull(tasks_table.deleted_at)))
      .orderBy(asc(tasks_table.due_date));
  }

  static async toggleComplete(taskId: string) {
    const current = await this.findById(taskId);

    if (!current) {
      return null;
    }

    const completed_at = current.completed_at ? null : new Date().toISOString();
    return await this.update(taskId, { completed_at });
  }
}

export default TaskRepository;
