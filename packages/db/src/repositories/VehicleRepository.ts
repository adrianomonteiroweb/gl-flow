import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { vehicles_table } from '../schema';

export class VehicleRepository extends BaseRepository {
  static override model: any = vehicles_table;

  static async findAllByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(vehicles_table)
      .where(and(eq(vehicles_table.workspace_id, workspaceId), isNull(vehicles_table.deleted_at)))
      .orderBy(desc(vehicles_table.created_at));
  }

  static async findAvailableByBranch(workspaceId: string, branchId: string) {
    return await this.db
      .select()
      .from(vehicles_table)
      .where(
        and(
          eq(vehicles_table.workspace_id, workspaceId),
          eq(vehicles_table.branch_id, branchId),
          eq(vehicles_table.status, 'available'),
          isNull(vehicles_table.deleted_at)
        )
      )
      .orderBy(asc(vehicles_table.make), asc(vehicles_table.model));
  }

  static async findByPlate(workspaceId: string, plate: string) {
    const [row] = await this.db
      .select()
      .from(vehicles_table)
      .where(and(eq(vehicles_table.workspace_id, workspaceId), eq(vehicles_table.plate, plate), isNull(vehicles_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  static async findByChassi(workspaceId: string, chassi: string) {
    const [row] = await this.db
      .select()
      .from(vehicles_table)
      .where(and(eq(vehicles_table.workspace_id, workspaceId), eq(vehicles_table.chassi, chassi), isNull(vehicles_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  static async setStatus(id: string, status: string) {
    return await this.update(id, { status });
  }

  static async softDelete(id: string) {
    return await this.update(id, { deleted_at: new Date().toISOString() });
  }
}

export default VehicleRepository;
