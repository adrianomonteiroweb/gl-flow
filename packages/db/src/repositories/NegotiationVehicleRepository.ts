import { and, eq, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { negotiation_vehicles, vehicles_table } from '../schema';

export class NegotiationVehicleRepository extends BaseRepository {
  static override model: any = negotiation_vehicles;

  static async findByNegotiation(negotiationId: string) {
    return await this.db
      .select({ link: negotiation_vehicles, vehicle: vehicles_table })
      .from(negotiation_vehicles)
      .leftJoin(vehicles_table, eq(negotiation_vehicles.vehicle_id, vehicles_table.id))
      .where(and(eq(negotiation_vehicles.negotiation_id, negotiationId), isNull(negotiation_vehicles.deleted_at)));
  }

  static async attach(data: { workspace_id: string; negotiation_id: string; vehicle_id: string; role: string; amount?: string | null }) {
    return await this.create(data);
  }

  static async detach(id: string) {
    return await this.update(id, { deleted_at: new Date().toISOString() });
  }
}

export default NegotiationVehicleRepository;
