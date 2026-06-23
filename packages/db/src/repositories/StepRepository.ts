import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';

import BaseRepository from './BaseRepository';
import { steps_table, status_table, step_statuses, leads_table } from '../schema';

export class StepRepository extends BaseRepository {
  static override model: any = steps_table;

  static async findAllByPipeline(workspaceId: string, pipelineId: string) {
    return await this.db
      .select()
      .from(steps_table)
      .where(and(eq(steps_table.workspace_id, workspaceId), eq(steps_table.pipeline_id, pipelineId), isNull(steps_table.deleted_at)))
      .orderBy(asc(steps_table.order));
  }

  static async findFirstByPipeline(workspaceId: string, pipelineId: string) {
    const [row] = await this.db
      .select()
      .from(steps_table)
      .where(and(eq(steps_table.workspace_id, workspaceId), eq(steps_table.pipeline_id, pipelineId), isNull(steps_table.deleted_at)))
      .orderBy(asc(steps_table.order))
      .limit(1);

    return row ?? null;
  }

  static async findBySlug(workspaceId: string, slug: string) {
    const [row] = await this.db
      .select()
      .from(steps_table)
      .where(and(eq(steps_table.workspace_id, workspaceId), eq(steps_table.slug, slug), isNull(steps_table.deleted_at)))
      .limit(1);

    return row ?? null;
  }

  /**
   * Stages of a pipeline, each with its linked statuses and the number of leads
   * currently sitting in the stage (used by the pipeline editor UI).
   */
  static async findStagesByPipeline(workspaceId: string, pipelineId: string) {
    const steps = await this.findAllByPipeline(workspaceId, pipelineId);

    if (steps.length === 0) {
      return [];
    }

    const stepIds = steps.map((s: any) => s.id);

    const links = await this.db
      .select({
        step_id: step_statuses.step_id,
        sort_order: step_statuses.sort_order,
        link_color: step_statuses.color,
        id: status_table.id,
        name: status_table.name,
        slug: status_table.slug,
        is_system: status_table.is_system,
        is_universal: status_table.is_universal,
        is_active: status_table.is_active,
        status_color: status_table.color,
      })
      .from(step_statuses)
      .innerJoin(status_table, eq(step_statuses.status_id, status_table.id))
      .where(and(inArray(step_statuses.step_id, stepIds), isNull(status_table.deleted_at)))
      .orderBy(asc(step_statuses.sort_order));

    const statusesByStep = new Map<string, any[]>();

    for (const link of links) {
      const list = statusesByStep.get(link.step_id) ?? [];
      list.push({
        id: link.id,
        name: link.name,
        slug: link.slug,
        is_system: link.is_system,
        is_universal: link.is_universal,
        is_active: link.is_active,
        color: link.link_color ?? link.status_color ?? null,
      });
      statusesByStep.set(link.step_id, list);
    }

    const counts = await this.db
      .select({ step_id: leads_table.step_id, value: count() })
      .from(leads_table)
      .where(and(eq(leads_table.workspace_id, workspaceId), inArray(leads_table.step_id, stepIds), isNull(leads_table.deleted_at)))
      .groupBy(leads_table.step_id);

    const countByStep = new Map<string, number>(counts.map((c: any) => [c.step_id, Number(c.value) || 0]));

    return steps.map((step: any) => ({
      ...step,
      statuses: statusesByStep.get(step.id) ?? [],
      leadCount: countByStep.get(step.id) ?? 0,
    }));
  }

  static async reorder(items: { id: string; order: number }[]) {
    for (const item of items) {
      await this.update(item.id, { order: String(item.order) });
    }
  }
}

export default StepRepository;
