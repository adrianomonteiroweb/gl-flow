import { and, asc, eq, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { branches_table } from '../schema';

export class BranchRepository extends BaseRepository {
  static override model: any = branches_table;

  static async findAllByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(branches_table)
      .where(and(eq(branches_table.workspace_id, workspaceId), isNull(branches_table.deleted_at)))
      .orderBy(asc(branches_table.name));
  }

  static async findActiveByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(branches_table)
      .where(and(eq(branches_table.workspace_id, workspaceId), eq(branches_table.is_active, true), isNull(branches_table.deleted_at)))
      .orderBy(asc(branches_table.name));
  }

  static async findByWorkspaceAndName(workspaceId: string, name: string) {
    const [row] = await this.db
      .select()
      .from(branches_table)
      .where(and(eq(branches_table.workspace_id, workspaceId), eq(branches_table.name, name), isNull(branches_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  static async softDelete(id: string) {
    return await this.update(id, { deleted_at: new Date().toISOString(), is_active: false });
  }
}

export default BranchRepository;
