import { eq, ilike, asc, desc, count, or, isNull, and, gt, inArray } from 'drizzle-orm';

import { leads_table, users_table, steps_table, status_table } from '@workspace/db';
import BaseRepository from '@workspace/db/repositories/BaseRepository';

export type GetLeadParams = {
  workspace_id: string;
  q?: string;
  page?: number;
  page_size?: number;
  steps?: string[];
  /** Deprecated — tasks were removed; kept for caller compatibility, ignored. */
  taskAlerts?: string[];
  /** When set, restrict results to leads in this pipeline. */
  pipelineId?: string;
  /** When set, restrict results to leads in one of these pipelines. */
  pipelineIds?: string[];
  /** When set, restrict results to leads assigned to this user. */
  assigneeId?: string;
  /** When true, include inactive (soft-deleted) clients in the results. */
  includeInactive?: boolean;
  /** When true, only leads with no assignee (unassigned). */
  unassignedOnly?: boolean;
  /** SDR scope: only leads assigned to this user OR currently unassigned. */
  mineOrUnassignedUserId?: string;
};

export type Ticket = {
  lead: any;
  chat?: any;
  assignee?: any;
};

/**
 * Builds the synthetic "chat"-shaped pipeline view from the lead's own columns.
 * The lead IS the kanban card now (it carries pipeline_id / step_id / status_id /
 * assignee_id), so this lets the existing board/list UI keep reading row.chat.*.
 * chat.id intentionally equals lead.id.
 */
const buildChat = (lead: any, step: any, status: any) => ({
  id: lead.id,
  lead_id: lead.id,
  pipeline_id: lead.pipeline_id ?? null,
  step: lead.step_id ?? null,
  status: lead.status_id ?? null,
  assignee_id: lead.assignee_id ?? null,
  step_name: step?.name ?? null,
  step_slug: step?.slug ?? null,
  status_name: status?.name ?? null,
  status_slug: status?.slug ?? null,
  done_at: lead.won_at ?? lead.lost_at ?? null,
  updated_at: lead.updated_at,
  created_at: lead.created_at,
});

export class LeadRepository extends BaseRepository {
  static override model: any = leads_table;

  static async getLeads({ workspace_id, q = '', page = 1, page_size = 10, steps, assigneeId, pipelineId, pipelineIds }: GetLeadParams) {
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const conditions: any[] = [eq(leads_table.workspace_id, workspace_id), isNull(leads_table.deleted_at)];

    if (assigneeId) {
      conditions.push(eq(leads_table.assignee_id, assigneeId));
    }

    if (pipelineId) {
      conditions.push(eq(leads_table.pipeline_id, pipelineId));
    } else if (pipelineIds?.length) {
      conditions.push(inArray(leads_table.pipeline_id, pipelineIds));
    }

    if (q) {
      conditions.push(or(ilike(leads_table.name, `%${q}%`), ilike(leads_table.email, `%${q}%`)));
    }

    if (steps?.length) {
      conditions.push(inArray(leads_table.step_id, steps));
    }

    const where = and(...conditions);

    const rows = await this.db
      .select({ lead: leads_table, assignee: users_table, step: steps_table, status: status_table })
      .from(leads_table)
      .leftJoin(users_table, eq(leads_table.assignee_id, users_table.id))
      .leftJoin(steps_table, eq(leads_table.step_id, steps_table.id))
      .leftJoin(status_table, eq(leads_table.status_id, status_table.id))
      .where(where)
      .orderBy(desc(leads_table.updated_at))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db.select({ value: count(leads_table.id) }).from(leads_table).where(where);

    return {
      count: countResult[0]?.value || 0,
      data: rows.map((row: any) => ({
        lead: row.lead,
        assignee: row.assignee,
        chat: buildChat(row.lead, row.step, row.status),
        tasks: [],
      })),
    };
  }

  static async getLeadsUpdatedSince(since: Date, workspaceId: string): Promise<number> {
    const result = await this.db
      .select({ value: count(leads_table.id) })
      .from(leads_table)
      .where(and(eq(leads_table.workspace_id, workspaceId), isNull(leads_table.deleted_at), gt(leads_table.updated_at, since.toISOString())));

    return result[0]?.value || 0;
  }

  static async getLeadById(id: string): Promise<Ticket | null> {
    const rows = await this.db
      .select({ lead: leads_table, assignee: users_table, step: steps_table, status: status_table })
      .from(leads_table)
      .leftJoin(users_table, eq(leads_table.assignee_id, users_table.id))
      .leftJoin(steps_table, eq(leads_table.step_id, steps_table.id))
      .leftJoin(status_table, eq(leads_table.status_id, status_table.id))
      .where(eq(leads_table.id, id));

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0] as any;
    return { lead: row.lead, assignee: row.assignee, chat: buildChat(row.lead, row.step, row.status) };
  }

  private static buildClientConditions({ workspace_id, q, assigneeId, includeInactive, unassignedOnly, mineOrUnassignedUserId }: GetLeadParams) {
    const conditions: any[] = [eq(leads_table.workspace_id, workspace_id)];

    if (!includeInactive) {
      conditions.push(isNull(leads_table.deleted_at));
    }

    if (assigneeId) {
      conditions.push(eq(leads_table.assignee_id, assigneeId));
    }

    if (unassignedOnly) {
      conditions.push(isNull(leads_table.assignee_id));
    }

    if (mineOrUnassignedUserId) {
      conditions.push(or(eq(leads_table.assignee_id, mineOrUnassignedUserId), isNull(leads_table.assignee_id)));
    }

    if (q) {
      conditions.push(or(ilike(leads_table.name, `%${q}%`), ilike(leads_table.email, `%${q}%`), ilike(leads_table.phone, `%${q}%`)));
    }

    return and(...conditions);
  }

  static async getClients(params: GetLeadParams) {
    const { page = 1, page_size = 10 } = params;
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const where = this.buildClientConditions(params);

    const rows = await this.db
      .select({ lead: leads_table, assignee: users_table })
      .from(leads_table)
      .leftJoin(users_table, eq(leads_table.assignee_id, users_table.id))
      .where(where)
      .orderBy(desc(leads_table.created_at))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db.select({ value: count(leads_table.id) }).from(leads_table).where(where);

    return {
      count: countResult[0]?.value || 0,
      data: rows.map((row: any) => ({ ...row.lead, assignee: row.assignee ?? null, chat_id: row.lead.id })),
    };
  }

  /**
   * Open load per responsible (active = not soft-deleted and not won/lost yet),
   * used to balance bulk distribution. Returns a count for every requested user.
   */
  static async countOpenAssignmentsByUser(workspaceId: string, userIds: string[]): Promise<Record<string, number>> {
    const loads: Record<string, number> = Object.fromEntries(userIds.map(id => [id, 0]));

    if (userIds.length === 0) {
      return loads;
    }

    const rows = await this.db
      .select({ assignee_id: leads_table.assignee_id, value: count() })
      .from(leads_table)
      .where(
        and(
          eq(leads_table.workspace_id, workspaceId),
          isNull(leads_table.deleted_at),
          inArray(leads_table.assignee_id, userIds),
          isNull(leads_table.won_at),
          isNull(leads_table.lost_at)
        )
      )
      .groupBy(leads_table.assignee_id);

    for (const row of rows) {
      if (row.assignee_id) {
        loads[row.assignee_id] = Number(row.value) || 0;
      }
    }

    return loads;
  }

  /**
   * Leads eligible for bulk distribution, oldest-first (FIFO).
   * - reassignAll = false: only unassigned, still-open leads.
   * - reassignAll = true: every still-open lead (full redistribution).
   */
  static async getDistributableLeads(workspaceId: string, reassignAll: boolean): Promise<{ leadId: string; assigneeId: string | null }[]> {
    const open = and(eq(leads_table.workspace_id, workspaceId), isNull(leads_table.deleted_at), isNull(leads_table.won_at), isNull(leads_table.lost_at));

    const where = reassignAll ? open : and(open, isNull(leads_table.assignee_id));

    const rows = await this.db
      .select({ leadId: leads_table.id, assigneeId: leads_table.assignee_id })
      .from(leads_table)
      .where(where)
      .orderBy(asc(leads_table.created_at));

    return rows.filter((row: any) => row.leadId).map((row: any) => ({ leadId: row.leadId as string, assigneeId: (row.assigneeId as string | null) ?? null }));
  }

  static async inactivateClient(id: string) {
    return await this.update(id, { status: 'inactive', deleted_at: new Date().toISOString() });
  }

  static async reactivateClient(id: string) {
    return await this.update(id, { status: 'active', deleted_at: null });
  }
}

export default LeadRepository;
