import { chats_table, leads_table, users_table, status_table, StepRepository, StatusRepository, PipelineRepository } from '@workspace/db';
import BaseRepository from '@workspace/db/repositories/BaseRepository';
import { asc, eq, ilike, desc, count, isNull, and } from 'drizzle-orm';

export type GetChatParams = {
  workspace_id: string;
  q?: string;
  page?: number;
  page_size?: number;
};

export type ChatWithRelations = {
  chat: any;
  lead?: any;
  assignee?: any;
};

export class ChatRepository extends BaseRepository {
  static override model: any = chats_table;

  static async getChats({ workspace_id, q = '', page = 1, page_size = 10 }: GetChatParams) {
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const workspaceFilter = eq(chats_table.workspace_id, workspace_id);
    const where = q ? and(workspaceFilter, ilike(chats_table.title, `%${q}%`)) : workspaceFilter;

    const data = await super.findAll(where, {
      orderBy: (chats_table: any) => [asc(chats_table.id)],
      limit,
      offset,
    });

    return {
      count: await super.count(where),
      data,
    };
  }

  static async search(searchTerm: string = '', options: any = {}) {
    const where = searchTerm ? ilike(chats_table.title, `%${searchTerm}%`) : undefined;
    return await this.findAll(where, options);
  }

  static async getChatsWithLeads({ workspace_id, q = '', page = 1, page_size = 10 }: GetChatParams): Promise<{ count: number; data: ChatWithRelations[] }> {
    const limit = page_size || 10;
    const offset = ((page || 1) - 1) * page_size;

    const baseConditions = [eq(chats_table.workspace_id, workspace_id), isNull(chats_table.done_at)];
    if (q) {
      baseConditions.push(ilike(chats_table.title, `%${q}%`));
    }
    const where = and(...baseConditions);

    const data = await this.db
      .select({
        chat: chats_table,
        lead: leads_table,
        assignee: users_table,
        statusName: status_table.name,
      })
      .from(chats_table)
      .leftJoin(leads_table, eq(chats_table.lead_id, leads_table.id))
      .leftJoin(users_table, eq(chats_table.assignee_id, users_table.id))
      .leftJoin(status_table, eq(chats_table.status, status_table.id))
      .where(where)
      .orderBy(desc(chats_table.created_at))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db.select({ value: count() }).from(chats_table).where(where);

    return {
      count: countResult[0]?.value || 0,
      data: data.map((row: any) => ({
        chat: row.chat ? { ...row.chat, status_name: row.statusName ?? null } : row.chat,
        lead: row.lead,
        assignee: row.assignee,
      })),
    };
  }

  static async getChatWithLeadById(id: string): Promise<ChatWithRelations | null> {
    const data = await this.db
      .select({
        chat: chats_table,
        lead: leads_table,
        assignee: users_table,
      })
      .from(chats_table)
      .leftJoin(leads_table, eq(chats_table.lead_id, leads_table.id))
      .leftJoin(users_table, eq(chats_table.assignee_id, users_table.id))
      .where(eq(chats_table.id, id))
      .limit(1);

    return data?.[0] || null;
  }

  static async updateStatus(id: string | number, status: string, stepId?: string) {
    // Validate that status exists
    const statusRecord = await StatusRepository.findById(status);
    if (!statusRecord) {
      throw new Error('Status inválido');
    }

    // If stepId is provided, validate that status is valid for that step
    if (stepId) {
      const isValid = await StatusRepository.validateStatusForStep(status, stepId);
      if (!isValid) {
        throw new Error('Status inválido para o step atual');
      }
    }

    return await this.update(id, { status });
  }

  /**
   * Sets the chat status without validating it against the status catalog.
   * Used by the conversation bot, where a status write must never abort the
   * customer-facing reply. The validating updateStatus stays for UI/actions.
   */
  static async setStatus(id: string | number, status: string) {
    return await this.update(id, { status });
  }

  /**
   * Sets the chat status resolving a workspace-scoped status by its stable slug.
   * Degrades gracefully: if the workspace/slug can't be resolved (e.g. the status
   * was deleted), it logs and no-ops instead of throwing — the conversation engine
   * runs on conv_state, so a missing CRM status write must never abort the reply.
   */
  static async setStatusBySlug(id: string | number, workspaceId: string | null | undefined, slug: string) {
    if (!workspaceId) {
      console.warn(`[ChatRepository] setStatusBySlug sem workspace — chat ${id}, slug "${slug}"`);
      return null;
    }

    const status = await StatusRepository.findBySlug(workspaceId, slug);
    if (!status) {
      console.warn(`[ChatRepository] status slug não encontrado: "${slug}" (workspace ${workspaceId})`);
      return null;
    }

    return await this.update(id, { status: status.id });
  }

  /**
   * When a new inbound message arrives on a chat still in the initial "pending"
   * status, advances it to "em_atendimento". Resolves both statuses by slug per
   * workspace, so it works regardless of the per-workspace status ids.
   */
  static async markInProgressIfPending(id: string | number, workspaceId: string | null | undefined, currentStatusId?: string) {
    if (!workspaceId) {
      return null;
    }

    const pending = await StatusRepository.findBySlug(workspaceId, 'pending');
    if (!pending || currentStatusId !== pending.id) {
      return null;
    }

    return await this.setStatusBySlug(id, workspaceId, 'em_atendimento');
  }

  static async updateAssignee(id: string | number, assignee_id: string | number | null) {
    return await this.update(id, { assignee_id });
  }

  /** The single active (not-yet-done) chat for a lead, if any. */
  static async findActiveByLeadId(leadId: string) {
    const data = await this.db
      .select()
      .from(chats_table)
      .where(and(eq(chats_table.lead_id, leadId), isNull(chats_table.done_at)))
      .limit(1);

    return data?.[0] || null;
  }

  /**
   * Returns the lead's active chat, creating a minimal one when none exists
   * (e.g. a WhatsApp lead whose chat creation failed). Resolves the workspace's
   * default pipeline + the system "new"/"pending" step/status by slug.
   */
  static async resolveActiveChat(leadId: string, workspaceId: string | null) {
    const existing = await this.findActiveByLeadId(leadId);
    if (existing) {
      return existing;
    }

    const payload: Record<string, unknown> = {
      lead_id: leadId,
      workspace_id: workspaceId,
      title: 'Novo Lead',
    };

    if (workspaceId) {
      const pipeline = await PipelineRepository.findDefaultByWorkspace(workspaceId);
      if (pipeline) {
        payload.pipeline_id = pipeline.id;

        const step = (await StepRepository.findBySlug(workspaceId, 'new')) ?? (await StepRepository.findFirstByPipeline(workspaceId, pipeline.id));
        if (step) payload.step = step.id;

        const status = await StatusRepository.findBySlug(workspaceId, 'pending');
        if (status) payload.status = status.id;
      }
    }

    return await this.create(payload);
  }

  static async updateStep(id: string | number, step: string, status?: string) {
    // Validate that step exists
    const stepRecord = await StepRepository.findById(step);
    if (!stepRecord) {
      throw new Error('Etapa inválida');
    }

    const payload: Record<string, unknown> = { step };
    if (status) payload.status = status;

    return await this.update(id, payload);
  }

  /**
   * Moves the chat to a workspace-scoped step (and optional status) resolved by
   * stable slug, also syncing pipeline_id. Degrades gracefully (logs + no-op) when
   * a slug can't be resolved, so deleting a "system" stage never breaks the bot.
   */
  static async updateStepBySlug(
    id: string | number,
    workspaceId: string | null | undefined,
    stepSlug: string,
    statusSlug?: string
  ) {
    if (!workspaceId) {
      console.warn(`[ChatRepository] updateStepBySlug sem workspace — chat ${id}, slug "${stepSlug}"`);
      return null;
    }

    const step = await StepRepository.findBySlug(workspaceId, stepSlug);
    if (!step) {
      console.warn(`[ChatRepository] step slug não encontrado: "${stepSlug}" (workspace ${workspaceId})`);
      return null;
    }

    const payload: Record<string, unknown> = { step: step.id };
    if (step.pipeline_id) payload.pipeline_id = step.pipeline_id;

    if (statusSlug) {
      const status = await StatusRepository.findBySlug(workspaceId, statusSlug);
      if (status) {
        payload.status = status.id;
      } else {
        console.warn(`[ChatRepository] status slug não encontrado: "${statusSlug}" (workspace ${workspaceId})`);
      }
    }

    return await this.update(id, payload);
  }

  static async closeChat(id: string | number) {
    return await this.update(id, { done_at: new Date().toISOString() });
  }
}

export default ChatRepository;
