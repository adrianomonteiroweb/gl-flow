import { eq, ne, ilike, asc, desc, count, or, isNull, and, gt, sql, inArray } from 'drizzle-orm';

import { leads_table, chats_table, users_table, tasks_table, messages_table, steps_table, status_table } from '@workspace/db';
import BaseRepository from '@workspace/db/repositories/BaseRepository';

type LeadTaskSummary = { due_date: string; completed_at: string | null };

export type GetLeadParams = {
  workspace_id: string;
  q?: string;
  page?: number;
  page_size?: number;
  steps?: string[];
  taskAlerts?: string[];
  /** When set, restrict results to leads whose active chat belongs to this pipeline. */
  pipelineId?: string;
  /** When set, restrict results to leads whose active chat belongs to one of these pipelines. */
  pipelineIds?: string[];
  /** When set, restrict results to leads whose chat is assigned to this user. */
  assigneeId?: string;
  /** When true, include inactive (soft-deleted) clients in the results. */
  includeInactive?: boolean;
  /** When true, only leads whose active chat has no assignee (unassigned). */
  unassignedOnly?: boolean;
  /** SDR scope: only leads assigned to this user OR currently unassigned. */
  mineOrUnassignedUserId?: string;
};

export type Ticket = {
  lead: any;
  chat?: any;
  assignee?: any;
  firstMessage?: any;
};

export class LeadRepository extends BaseRepository {
  static override model: any = leads_table;

  static async getLeads({ workspace_id, q = '', page = 1, page_size = 10, steps, taskAlerts, assigneeId, pipelineId, pipelineIds }: GetLeadParams) {
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const conditions: any[] = [eq(leads_table.workspace_id, workspace_id), isNull(chats_table.done_at), isNull(leads_table.deleted_at)];

    if (assigneeId) {
      conditions.push(eq(chats_table.assignee_id, assigneeId));
    }

    if (pipelineId) {
      conditions.push(eq(chats_table.pipeline_id, pipelineId));
    } else if (pipelineIds?.length) {
      conditions.push(inArray(chats_table.pipeline_id, pipelineIds));
    }

    if (q) {
      conditions.push(or(ilike(leads_table.name, `%${q}%`), ilike(leads_table.email, `%${q}%`)));
    }

    if (steps?.length) {
      conditions.push(inArray(chats_table.step, steps));
    }

    if (taskAlerts?.length) {
      const alertConditions: any[] = [];

      if (taskAlerts.includes('overdue')) {
        alertConditions.push(sql`EXISTS (
          SELECT 1 FROM ${tasks_table}
          WHERE ${tasks_table.lead_id} = ${leads_table.id}
          AND ${tasks_table.completed_at} IS NULL
          AND (${tasks_table.due_date} AT TIME ZONE 'America/Fortaleza')::date
            < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Fortaleza')::date
        )`);
      }

      if (taskAlerts.includes('near')) {
        alertConditions.push(sql`EXISTS (
          SELECT 1 FROM ${tasks_table}
          WHERE ${tasks_table.lead_id} = ${leads_table.id}
          AND ${tasks_table.completed_at} IS NULL
          AND (${tasks_table.due_date} AT TIME ZONE 'America/Fortaleza')::date
            = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Fortaleza')::date
        )`);
      }

      if (taskAlerts.includes('upcoming')) {
        alertConditions.push(sql`EXISTS (
          SELECT 1 FROM ${tasks_table}
          WHERE ${tasks_table.lead_id} = ${leads_table.id}
          AND ${tasks_table.completed_at} IS NULL
          AND (${tasks_table.due_date} AT TIME ZONE 'America/Fortaleza')::date
            > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Fortaleza')::date
        )`);
      }

      if (taskAlerts.includes('none')) {
        alertConditions.push(sql`NOT EXISTS (
          SELECT 1 FROM ${tasks_table}
          WHERE ${tasks_table.lead_id} = ${leads_table.id}
        )`);
      }

      if (alertConditions.length === 1) {
        conditions.push(alertConditions[0]);
      } else if (alertConditions.length > 1) {
        conditions.push(or(...alertConditions));
      }
    }

    const where = and(...conditions);

    // Fetch leads with pagination
    const leadsData = await this.db
      .selectDistinct({
        lead: leads_table,
        chat: chats_table,
        assignee: users_table,
        stepName: steps_table.name,
        stepSlug: steps_table.slug,
        statusName: status_table.name,
        statusSlug: status_table.slug,
      })
      .from(leads_table)
      .leftJoin(chats_table, eq(leads_table.id, chats_table.lead_id))
      .leftJoin(users_table, eq(chats_table.assignee_id, users_table.id))
      .leftJoin(steps_table, eq(chats_table.step, steps_table.id))
      .leftJoin(status_table, eq(chats_table.status, status_table.id))
      .where(where)
      .orderBy(desc(chats_table.updated_at || leads_table.updated_at))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db
      .selectDistinct({ value: count(leads_table.id) })
      .from(leads_table)
      .leftJoin(chats_table, eq(leads_table.id, chats_table.lead_id))
      .where(where);

    // Batch-fetch task summaries for the current page of leads (no N+1).
    const leadIds = leadsData.map((row: any) => row.lead?.id).filter(Boolean) as string[];

    const taskRows = leadIds.length
      ? await this.db
          .select({
            lead_id: tasks_table.lead_id,
            due_date: tasks_table.due_date,
            completed_at: tasks_table.completed_at,
          })
          .from(tasks_table)
          .where(inArray(tasks_table.lead_id, leadIds))
      : [];

    const tasksByLead = new Map<string, LeadTaskSummary[]>();

    for (const task of taskRows) {
      const list = tasksByLead.get(task.lead_id) ?? [];
      list.push({ due_date: task.due_date, completed_at: task.completed_at });
      tasksByLead.set(task.lead_id, list);
    }

    return {
      count: countResult[0]?.value || 0,
      data: leadsData.map((row: any) => ({
        lead: row.lead,
        assignee: row.assignee,
        chat: row.chat
          ? { ...row.chat, step_name: row.stepName ?? null, step_slug: row.stepSlug ?? null, status_name: row.statusName ?? null, status_slug: row.statusSlug ?? null }
          : row.chat,
        tasks: row.lead?.id ? (tasksByLead.get(row.lead.id) ?? []) : [],
      })),
    };
  }

  static async getLeadsUpdatedSince(since: Date, workspaceId: string): Promise<number> {
    const result = await this.db
      .select({ value: count(chats_table.id) })
      .from(chats_table)
      .where(and(eq(chats_table.workspace_id, workspaceId), isNull(chats_table.done_at), gt(chats_table.updated_at, since.toISOString())));

    return result[0]?.value || 0;
  }

  static async getLeadWithChatsById(id: string): Promise<Ticket | null> {
    const data = await this.db
      .select({
        lead: leads_table,
        chat: chats_table,
        assignee: users_table,
        stepName: steps_table.name,
        stepSlug: steps_table.slug,
        statusName: status_table.name,
        statusSlug: status_table.slug,
      })
      .from(leads_table)
      .leftJoin(chats_table, eq(leads_table.id, chats_table.lead_id))
      .leftJoin(users_table, eq(chats_table.assignee_id, users_table.id))
      .leftJoin(steps_table, eq(chats_table.step, steps_table.id))
      .leftJoin(status_table, eq(chats_table.status, status_table.id))
      .where(eq(leads_table.id, id));

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0] as any;
    return {
      lead: row.lead,
      assignee: row.assignee,
      chat: row.chat
        ? { ...row.chat, step_name: row.stepName ?? null, step_slug: row.stepSlug ?? null, status_name: row.statusName ?? null, status_slug: row.statusSlug ?? null }
        : row.chat,
    };
  }

  /**
   * Builds the WHERE conditions shared by the client list and its count, all
   * scoped to the lead's single active chat (joined separately below).
   */
  private static buildClientConditions({ workspace_id, q, assigneeId, includeInactive, unassignedOnly, mineOrUnassignedUserId }: GetLeadParams) {
    const conditions: any[] = [eq(leads_table.workspace_id, workspace_id)];

    if (!includeInactive) {
      conditions.push(isNull(leads_table.deleted_at));
    }

    // Responsible filters reference the active chat joined onto the lead.
    if (assigneeId) {
      conditions.push(eq(chats_table.assignee_id, assigneeId));
    }

    if (unassignedOnly) {
      conditions.push(isNull(chats_table.assignee_id));
    }

    if (mineOrUnassignedUserId) {
      conditions.push(or(eq(chats_table.assignee_id, mineOrUnassignedUserId), isNull(chats_table.assignee_id)));
    }

    if (q) {
      conditions.push(or(ilike(leads_table.name, `%${q}%`), ilike(leads_table.email, `%${q}%`), ilike(leads_table.phone, `%${q}%`)));
    }

    return and(...conditions);
  }

  /** Active chat = the lead's chat that hasn't been closed (uq_active_chat_per_lead). */
  private static get activeChatJoin() {
    return and(eq(leads_table.id, chats_table.lead_id), isNull(chats_table.done_at));
  }

  static async getClients(params: GetLeadParams) {
    const { page = 1, page_size = 10 } = params;
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const where = this.buildClientConditions(params);

    const rows = await this.db
      .select({
        lead: leads_table,
        chat: chats_table,
        assignee: users_table,
      })
      .from(leads_table)
      .leftJoin(chats_table, this.activeChatJoin)
      .leftJoin(users_table, eq(chats_table.assignee_id, users_table.id))
      .where(where)
      .orderBy(desc(leads_table.created_at))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db
      .select({ value: count(leads_table.id) })
      .from(leads_table)
      .leftJoin(chats_table, this.activeChatJoin)
      .where(where);

    return {
      count: countResult[0]?.value || 0,
      // Flatten so existing columns keep reading row.original.name etc., while
      // exposing the active chat's assignee and id for the new responsible column.
      data: rows.map((row: any) => ({
        ...row.lead,
        assignee: row.assignee ?? null,
        chat_id: row.chat?.id ?? null,
      })),
    };
  }

  /**
   * Open-atendimento load per responsible, used to balance distribution.
   * "Open" = active chat (not done), lead not inactive, and step not yet closed
   * (won/lost deals are already handled, so they don't count as work to do).
   * Returns a count for every requested user id, defaulting to 0.
   */
  static async countOpenAssignmentsByUser(workspaceId: string, userIds: string[]): Promise<Record<string, number>> {
    const loads: Record<string, number> = Object.fromEntries(userIds.map(id => [id, 0]));

    if (userIds.length === 0) {
      return loads;
    }

    const rows = await this.db
      .select({ assignee_id: chats_table.assignee_id, value: count() })
      .from(leads_table)
      .innerJoin(chats_table, and(eq(leads_table.id, chats_table.lead_id), isNull(chats_table.done_at)))
      .leftJoin(steps_table, eq(chats_table.step, steps_table.id))
      .where(
        and(
          eq(leads_table.workspace_id, workspaceId),
          isNull(leads_table.deleted_at),
          inArray(chats_table.assignee_id, userIds),
          or(isNull(steps_table.slug), ne(steps_table.slug, 'closed'))
        )
      )
      .groupBy(chats_table.assignee_id);

    for (const row of rows) {
      if (row.assignee_id) {
        loads[row.assignee_id] = Number(row.value) || 0;
      }
    }

    return loads;
  }

  /**
   * Leads eligible for bulk distribution, oldest-first (FIFO).
   *
   * An atendimento is "fixed" (kept as is) only when it BOTH has a responsible
   * AND a human agent already interacted with the lead — i.e. it is genuinely
   * being worked. Everything else (no responsible, or assigned but not yet worked
   * — e.g. created with the creator as a nominal owner) is distributable.
   *
   * - reassignAll = false (default): exclude the fixed ones.
   * - reassignAll = true: include everything still open (full redistribution).
   *
   * "Human interaction" = a message whose sender is a human user (sender.type
   * 'user') other than the automation bot (sender.id 'system').
   */
  static async getDistributableLeads(workspaceId: string, reassignAll: boolean): Promise<{ leadId: string; assigneeId: string | null }[]> {
    // A lead's active chat is joined; no chat => not closed / unassigned / no interaction.
    // Closed = the step whose slug is 'closed'; custom steps (null slug) count as open.
    const notClosed = or(isNull(chats_table.step), isNull(steps_table.slug), ne(steps_table.slug, 'closed'));

    // No human agent (other than the automation bot) has replied in this chat.
    const noHumanInteraction = sql`NOT EXISTS (
      SELECT 1 FROM ${messages_table}
      WHERE ${messages_table.chat_id} = ${chats_table.id}
        AND ${messages_table.sender}->>'type' = 'user'
        AND ${messages_table.sender}->>'id' <> 'system'
    )`;

    // Fixed = being actively worked (has a responsible AND a human already
    // replied). Distributable = not fixed: unassigned OR no human interaction yet.
    const notFixed = or(isNull(chats_table.assignee_id), noHumanInteraction);

    const where = reassignAll
      ? and(eq(leads_table.workspace_id, workspaceId), isNull(leads_table.deleted_at), notClosed)
      : and(eq(leads_table.workspace_id, workspaceId), isNull(leads_table.deleted_at), notClosed, notFixed);

    const rows = await this.db
      .select({ leadId: leads_table.id, assigneeId: chats_table.assignee_id })
      .from(leads_table)
      .leftJoin(chats_table, this.activeChatJoin)
      .leftJoin(steps_table, eq(chats_table.step, steps_table.id))
      .where(where)
      .orderBy(asc(leads_table.created_at));

    return rows
      .filter((row: any) => row.leadId)
      .map((row: any) => ({ leadId: row.leadId as string, assigneeId: (row.assigneeId as string | null) ?? null }));
  }

  /** Whether a human agent (not the automation bot) already replied in a chat. */
  static async chatHasHumanInteraction(chatId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: messages_table.id })
      .from(messages_table)
      .where(
        and(
          eq(messages_table.chat_id, chatId),
          sql`${messages_table.sender}->>'type' = 'user'`,
          sql`${messages_table.sender}->>'id' <> 'system'`
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  static async inactivateClient(id: string) {
    return await this.update(id, {
      status: 'inactive',
      deleted_at: new Date().toISOString(),
    });
  }

  static async reactivateClient(id: string) {
    return await this.update(id, {
      status: 'active',
      deleted_at: null,
    });
  }
}

export default LeadRepository;
