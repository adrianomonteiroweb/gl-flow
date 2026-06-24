import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { negotiations_table } from '../schema';

export class NegotiationRepository extends BaseRepository {
  static override model: any = negotiations_table;

  static async findAllByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(negotiations_table)
      .where(and(eq(negotiations_table.workspace_id, workspaceId), isNull(negotiations_table.deleted_at)))
      .orderBy(desc(negotiations_table.created_at));
  }

  static async findByClient(workspaceId: string, clientId: string) {
    return await this.db
      .select()
      .from(negotiations_table)
      .where(and(eq(negotiations_table.workspace_id, workspaceId), eq(negotiations_table.client_id, clientId), isNull(negotiations_table.deleted_at)))
      .orderBy(desc(negotiations_table.created_at));
  }

  static async findByBranch(workspaceId: string, branchId: string) {
    return await this.db
      .select()
      .from(negotiations_table)
      .where(and(eq(negotiations_table.workspace_id, workspaceId), eq(negotiations_table.branch_id, branchId), isNull(negotiations_table.deleted_at)))
      .orderBy(desc(negotiations_table.created_at));
  }

  static async findByAssignee(workspaceId: string, assigneeId: string) {
    return await this.db
      .select()
      .from(negotiations_table)
      .where(and(eq(negotiations_table.workspace_id, workspaceId), eq(negotiations_table.assignee_id, assigneeId), isNull(negotiations_table.deleted_at)))
      .orderBy(desc(negotiations_table.created_at));
  }

  static async findByPipelineStep(workspaceId: string, pipelineId: string, stepId: string) {
    return await this.db
      .select()
      .from(negotiations_table)
      .where(
        and(
          eq(negotiations_table.workspace_id, workspaceId),
          eq(negotiations_table.pipeline_id, pipelineId),
          eq(negotiations_table.step_id, stepId),
          isNull(negotiations_table.deleted_at)
        )
      )
      .orderBy(asc(negotiations_table.sort_order));
  }

  static async findOpenByAssignee(workspaceId: string, assigneeId: string) {
    return await this.db
      .select()
      .from(negotiations_table)
      .where(
        and(
          eq(negotiations_table.workspace_id, workspaceId),
          eq(negotiations_table.assignee_id, assigneeId),
          isNull(negotiations_table.won_at),
          isNull(negotiations_table.lost_at),
          isNull(negotiations_table.deleted_at)
        )
      )
      .orderBy(asc(negotiations_table.sort_order));
  }

  static async softDelete(id: string) {
    return await this.update(id, { deleted_at: new Date().toISOString() });
  }
}

export default NegotiationRepository;
