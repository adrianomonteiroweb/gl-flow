import { and, asc, eq, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { pipelines_table } from '../schema';

export class PipelineRepository extends BaseRepository {
  static override model: any = pipelines_table;

  static async findAllByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(pipelines_table)
      .where(and(eq(pipelines_table.workspace_id, workspaceId), isNull(pipelines_table.deleted_at)))
      .orderBy(asc(pipelines_table.sort_order));
  }

  static async findByWorkspaceAndName(workspaceId: string, name: string) {
    const [row] = await this.db
      .select()
      .from(pipelines_table)
      .where(and(eq(pipelines_table.workspace_id, workspaceId), eq(pipelines_table.name, name), isNull(pipelines_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  static async findDefaultByWorkspace(workspaceId: string) {
    const [row] = await this.db
      .select()
      .from(pipelines_table)
      .where(and(eq(pipelines_table.workspace_id, workspaceId), eq(pipelines_table.is_default, true), isNull(pipelines_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  static async reorder(items: { id: string; sort_order: number }[]) {
    for (const item of items) {
      await this.update(item.id, { sort_order: item.sort_order });
    }
  }
}

export default PipelineRepository;
