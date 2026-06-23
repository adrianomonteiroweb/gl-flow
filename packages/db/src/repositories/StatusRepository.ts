import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { status_table, step_statuses } from '../schema';

export class StatusRepository extends BaseRepository {
  static override model: any = status_table;

  static async findAllByWorkspace(workspaceId: string) {
    return await this.db
      .select()
      .from(status_table)
      .where(and(eq(status_table.workspace_id, workspaceId), isNull(status_table.deleted_at)))
      .orderBy(asc(status_table.name));
  }

  static async findBySlug(workspaceId: string, slug: string) {
    const [row] = await this.db
      .select()
      .from(status_table)
      .where(and(eq(status_table.workspace_id, workspaceId), eq(status_table.slug, slug), isNull(status_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  /** Statuses available for a step: the ones linked to it plus workspace-universal ones. */
  static async findStatusesForStep(workspaceId: string, stepId: string) {
    const linked = await this.db
      .select({
        id: status_table.id,
        name: status_table.name,
        slug: status_table.slug,
        is_system: status_table.is_system,
        is_universal: status_table.is_universal,
        is_active: status_table.is_active,
        sort_order: step_statuses.sort_order,
        color: step_statuses.color,
        status_color: status_table.color,
      })
      .from(step_statuses)
      .innerJoin(status_table, eq(step_statuses.status_id, status_table.id))
      .where(and(eq(step_statuses.step_id, stepId), eq(status_table.workspace_id, workspaceId), isNull(status_table.deleted_at)))
      .orderBy(asc(step_statuses.sort_order));

    const universal = await this.db
      .select()
      .from(status_table)
      .where(and(eq(status_table.workspace_id, workspaceId), eq(status_table.is_universal, true), isNull(status_table.deleted_at)));

    const seen = new Set<string>(linked.map((s: any) => s.id));

    const merged = [
      ...linked.map((s: any) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        is_system: s.is_system,
        is_universal: s.is_universal,
        is_active: s.is_active,
        color: s.color ?? s.status_color ?? null,
      })),
      ...universal
        .filter((u: any) => !seen.has(u.id))
        .map((u: any) => ({
          id: u.id,
          name: u.name,
          slug: u.slug,
          is_system: u.is_system,
          is_universal: u.is_universal,
          is_active: u.is_active,
          color: u.color ?? null,
        })),
    ];

    return merged;
  }

  static async validateStatusForStep(statusId: string, stepId: string): Promise<boolean> {
    const status = await this.findById(statusId);

    if (!status) {
      return false;
    }

    if (status.is_universal) {
      return true;
    }

    const [link] = await this.db
      .select({ step_id: step_statuses.step_id })
      .from(step_statuses)
      .where(and(eq(step_statuses.step_id, stepId), eq(step_statuses.status_id, statusId)))
      .limit(1);

    return !!link;
  }

  static async nextSortOrderForStep(stepId: string): Promise<number> {
    const [row] = await this.db
      .select({ sort_order: step_statuses.sort_order })
      .from(step_statuses)
      .where(eq(step_statuses.step_id, stepId))
      .orderBy(desc(step_statuses.sort_order))
      .limit(1);

    return (row?.sort_order ?? -1) + 1;
  }

  static async linkToStep(stepId: string, statusId: string, sortOrder = 0) {
    return await this.db.insert(step_statuses).values({ step_id: stepId, status_id: statusId, sort_order: sortOrder }).onConflictDoNothing();
  }

  static async unlinkFromStep(stepId: string, statusId: string) {
    return await this.db.delete(step_statuses).where(and(eq(step_statuses.step_id, stepId), eq(step_statuses.status_id, statusId)));
  }

  static async updateStepStatusColor(stepId: string, statusId: string, color: string | null) {
    return await this.db
      .update(step_statuses)
      .set({ color, updated_at: new Date() })
      .where(and(eq(step_statuses.step_id, stepId), eq(step_statuses.status_id, statusId)));
  }
}

export default StatusRepository;
