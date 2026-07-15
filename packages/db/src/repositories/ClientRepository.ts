import { and, asc, count, desc, eq, ilike, isNull, isNotNull, or } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { clients_table } from '../schema';

export class ClientRepository extends BaseRepository {
  static override model: any = clients_table;

  static async findAllByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(clients_table)
      .where(and(eq(clients_table.workspace_id, workspaceId), isNull(clients_table.deleted_at)))
      .orderBy(desc(clients_table.created_at));
  }

  static async findActiveByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(clients_table)
      .where(and(eq(clients_table.workspace_id, workspaceId), eq(clients_table.status, 'active'), isNull(clients_table.deleted_at)))
      .orderBy(asc(clients_table.name));
  }

  static async findByBranch(workspaceId: string, branchId: string) {
    return await this.db
      .select()
      .from(clients_table)
      .where(and(eq(clients_table.workspace_id, workspaceId), eq(clients_table.branch_id, branchId), isNull(clients_table.deleted_at)))
      .orderBy(asc(clients_table.name));
  }

  static async findByAssignee(workspaceId: string, assigneeId: string) {
    return await this.db
      .select()
      .from(clients_table)
      .where(and(eq(clients_table.workspace_id, workspaceId), eq(clients_table.assignee_id, assigneeId), isNull(clients_table.deleted_at)))
      .orderBy(asc(clients_table.name));
  }

  static async findByDocument(workspaceId: string, document: string) {
    const [row] = await this.db
      .select()
      .from(clients_table)
      .where(and(eq(clients_table.workspace_id, workspaceId), eq(clients_table.document, document), isNull(clients_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  static async findByPhone(workspaceId: string, phone: string) {
    const [row] = await this.db
      .select()
      .from(clients_table)
      .where(and(eq(clients_table.workspace_id, workspaceId), eq(clients_table.phone, phone), isNull(clients_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  static async search(workspaceId: string, q: string) {
    const pattern = `%${q}%`;

    return await this.db
      .select()
      .from(clients_table)
      .where(
        and(
          eq(clients_table.workspace_id, workspaceId),
          isNull(clients_table.deleted_at),
          or(ilike(clients_table.name, pattern), ilike(clients_table.phone, pattern), ilike(clients_table.document, pattern), ilike(clients_table.email, pattern))
        )
      )
      .orderBy(asc(clients_table.name))
      .limit(50);
  }

  static async getClients(params: {
    workspace_id: string;
    q?: string;
    page?: number;
    page_size?: number;
    includeInactive?: boolean;
    assigneeId?: string;
    unassignedOnly?: boolean;
    mineOrUnassignedUserId?: string;
    type?: 'all' | 'quick_lead' | 'complete';
    source?: 'lead' | 'integration';
  }) {
    const { page = 1, page_size = 10 } = params;
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [eq(clients_table.workspace_id, params.workspace_id)];

    if (!params.includeInactive) {
      conditions.push(isNull(clients_table.deleted_at));
    }

    if (params.q) {
      const pattern = `%${params.q}%`;

      conditions.push(
        or(
          ilike(clients_table.name, pattern),
          ilike(clients_table.phone, pattern),
          ilike(clients_table.document, pattern),
          ilike(clients_table.email, pattern)
        )!
      );
    }

    if (params.assigneeId) {
      conditions.push(eq(clients_table.assignee_id, params.assigneeId));
    }

    if (params.unassignedOnly) {
      conditions.push(isNull(clients_table.assignee_id));
    }

    if (params.mineOrUnassignedUserId) {
      conditions.push(
        or(eq(clients_table.assignee_id, params.mineOrUnassignedUserId), isNull(clients_table.assignee_id))!
      );
    }

    if (params.type === 'quick_lead') {
      conditions.push(isNull(clients_table.document));
    } else if (params.type === 'complete') {
      conditions.push(isNotNull(clients_table.document));
    }

    if (params.source) {
      conditions.push(eq(clients_table.source, params.source));
    }

    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(clients_table)
      .where(where)
      .orderBy(desc(clients_table.created_at))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db.select({ value: count(clients_table.id) }).from(clients_table).where(where);

    return {
      count: countResult[0]?.value || 0,
      data: rows,
    };
  }

  static async softDelete(id: string) {
    return await this.update(id, { deleted_at: new Date().toISOString(), status: 'inactive' });
  }
}

export default ClientRepository;
