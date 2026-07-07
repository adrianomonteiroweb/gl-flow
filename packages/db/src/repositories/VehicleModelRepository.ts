import { and, asc, eq, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { vehicle_models_table } from '../schema';

export class VehicleModelRepository extends BaseRepository {
  static override model: any = vehicle_models_table;

  static async findAllByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(vehicle_models_table)
      .where(and(eq(vehicle_models_table.workspace_id, workspaceId), isNull(vehicle_models_table.deleted_at)))
      .orderBy(asc(vehicle_models_table.sort_order), asc(vehicle_models_table.model));
  }

  static async findActiveByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(vehicle_models_table)
      .where(
        and(
          eq(vehicle_models_table.workspace_id, workspaceId),
          eq(vehicle_models_table.is_active, true),
          isNull(vehicle_models_table.deleted_at)
        )
      )
      .orderBy(asc(vehicle_models_table.sort_order), asc(vehicle_models_table.model));
  }

  static async findByWorkspaceAndSegment(workspaceId: string, segment: string) {
    return await this.db
      .select()
      .from(vehicle_models_table)
      .where(
        and(
          eq(vehicle_models_table.workspace_id, workspaceId),
          eq(vehicle_models_table.segment, segment),
          isNull(vehicle_models_table.deleted_at)
        )
      )
      .orderBy(asc(vehicle_models_table.sort_order), asc(vehicle_models_table.model));
  }

  static async findInWorkspace(id: string, workspaceId: string) {
    const [row] = await this.db
      .select()
      .from(vehicle_models_table)
      .where(
        and(
          eq(vehicle_models_table.id, id),
          eq(vehicle_models_table.workspace_id, workspaceId),
          isNull(vehicle_models_table.deleted_at)
        )
      )
      .limit(1);

    return row ?? null;
  }

  static async softDelete(id: string) {
    return await this.update(id, { deleted_at: new Date().toISOString(), is_active: false });
  }
}

export default VehicleModelRepository;
