import { and, asc, eq, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { loss_reasons_table } from '../schema';

export class LossReasonRepository extends BaseRepository {
  static override model: any = loss_reasons_table;

  static async findAllByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(loss_reasons_table)
      .where(and(eq(loss_reasons_table.workspace_id, workspaceId), isNull(loss_reasons_table.deleted_at)))
      .orderBy(asc(loss_reasons_table.sort_order));
  }

  static async findActiveByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(loss_reasons_table)
      .where(and(eq(loss_reasons_table.workspace_id, workspaceId), eq(loss_reasons_table.is_active, true), isNull(loss_reasons_table.deleted_at)))
      .orderBy(asc(loss_reasons_table.sort_order));
  }

  static async findByWorkspaceAndName(workspaceId: string, name: string) {
    const [row] = await this.db
      .select()
      .from(loss_reasons_table)
      .where(and(eq(loss_reasons_table.workspace_id, workspaceId), eq(loss_reasons_table.name, name), isNull(loss_reasons_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  static async softDelete(id: string) {
    return await this.update(id, { deleted_at: new Date().toISOString(), is_active: false });
  }

  static async reorder(items: { id: string; sort_order: number }[]) {
    for (const item of items) {
      await this.update(item.id, { sort_order: item.sort_order });
    }
  }
}

export default LossReasonRepository;
