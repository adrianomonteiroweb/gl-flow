import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { db } from './db';
import { pipelines_table, steps_table, status_table, step_statuses } from './schema';

export const DEFAULT_PIPELINE_NAME = 'Comercial';

type StatusColor = 'green' | 'red' | 'yellow' | null;
type StepSeed = { slug: string; name: string; order: string; color: string; is_post_sale: boolean };
type StatusSeed = { slug: string; name: string; is_universal: boolean; color?: StatusColor };
type LinkSeed = { step_slug: string; status_slug: string };

// Sales pipeline (prototype "Grupo Linhares Honda"): the salesperson works leads
// from prospecting up to payment/approval; faturamento and entrega are post-sale
// stages (is_post_sale) that a `member` can view but not change.
export const PIPELINE_STEP_SEED: StepSeed[] = [
  { slug: 'prospeccao', name: 'Prospecção', order: '1', color: 'blue', is_post_sale: false },
  { slug: 'qualificacao', name: 'Qualificação', order: '2', color: 'emerald', is_post_sale: false },
  { slug: 'proposta', name: 'Proposta', order: '3', color: 'amber', is_post_sale: false },
  { slug: 'pagamento', name: 'Pagamento', order: '4', color: 'purple', is_post_sale: false },
  { slug: 'aprovacao', name: 'Aprovação', order: '5', color: 'indigo', is_post_sale: false },
  { slug: 'faturamento', name: 'Faturamento', order: '6', color: 'cyan', is_post_sale: true },
  { slug: 'entrega', name: 'Entrega', order: '7', color: 'green', is_post_sale: true },
];

export const PIPELINE_STATUS_SEED: StatusSeed[] = [
  // Universal outcomes — available across every stage.
  { slug: 'ganha', name: 'Ganha', is_universal: true, color: 'green' },
  { slug: 'perdida', name: 'Perdida', is_universal: true, color: 'red' },
  // Prospecção
  { slug: 'novo', name: 'Novo', is_universal: false },
  { slug: 'em_contato', name: 'Em Contato', is_universal: false },
  // Qualificação
  { slug: 'qualificado', name: 'Qualificado', is_universal: false, color: 'green' },
  { slug: 'nao_qualificado', name: 'Não Qualificado', is_universal: false, color: 'red' },
  // Proposta
  { slug: 'proposta_enviada', name: 'Proposta Enviada', is_universal: false },
  { slug: 'em_negociacao', name: 'Em Negociação', is_universal: false, color: 'yellow' },
  // Pagamento
  { slug: 'aguardando_pagamento', name: 'Aguardando Pagamento', is_universal: false, color: 'yellow' },
  { slug: 'financiamento', name: 'Financiamento', is_universal: false },
  { slug: 'pago', name: 'Pago', is_universal: false, color: 'green' },
  // Aprovação
  { slug: 'pendente', name: 'Pendente', is_universal: false, color: 'yellow' },
  { slug: 'aprovado', name: 'Aprovado', is_universal: false, color: 'green' },
  { slug: 'reprovado', name: 'Reprovado', is_universal: false, color: 'red' },
  // Faturamento (pós-venda)
  { slug: 'a_faturar', name: 'A Faturar', is_universal: false },
  { slug: 'faturado', name: 'Faturado', is_universal: false, color: 'green' },
  // Entrega (pós-venda): transporte e emplacamento
  { slug: 'aguardando_transporte', name: 'Aguardando Transporte', is_universal: false, color: 'yellow' },
  { slug: 'em_transporte', name: 'Em Transporte', is_universal: false, color: 'yellow' },
  { slug: 'emplacamento', name: 'Emplacamento', is_universal: false, color: 'yellow' },
  { slug: 'entregue', name: 'Entregue', is_universal: false, color: 'green' },
];

export const PIPELINE_STEP_STATUS_SEED: LinkSeed[] = [
  { step_slug: 'prospeccao', status_slug: 'novo' },
  { step_slug: 'prospeccao', status_slug: 'em_contato' },
  { step_slug: 'qualificacao', status_slug: 'qualificado' },
  { step_slug: 'qualificacao', status_slug: 'nao_qualificado' },
  { step_slug: 'proposta', status_slug: 'proposta_enviada' },
  { step_slug: 'proposta', status_slug: 'em_negociacao' },
  { step_slug: 'pagamento', status_slug: 'aguardando_pagamento' },
  { step_slug: 'pagamento', status_slug: 'financiamento' },
  { step_slug: 'pagamento', status_slug: 'pago' },
  { step_slug: 'aprovacao', status_slug: 'pendente' },
  { step_slug: 'aprovacao', status_slug: 'aprovado' },
  { step_slug: 'aprovacao', status_slug: 'reprovado' },
  { step_slug: 'faturamento', status_slug: 'a_faturar' },
  { step_slug: 'faturamento', status_slug: 'faturado' },
  { step_slug: 'entrega', status_slug: 'aguardando_transporte' },
  { step_slug: 'entrega', status_slug: 'em_transporte' },
  { step_slug: 'entrega', status_slug: 'emplacamento' },
  { step_slug: 'entrega', status_slug: 'entregue' },
];

export type ProvisionResult = {
  pipelineId: string;
  stepMap: Record<string, string>;
  statusMap: Record<string, string>;
};

/**
 * Idempotently provisions a workspace's default pipeline + system steps/statuses
 * (keyed by stable slug). Safe to call on workspace creation and re-run by the
 * migration script. Pass a transaction to run inside an existing one.
 */
export const provisionWorkspacePipeline = async (workspaceId: string, tx?: NodePgDatabase<any>): Promise<ProvisionResult> => {
  const dbx: any = tx ?? db;

  const existing = await dbx
    .select({ id: pipelines_table.id })
    .from(pipelines_table)
    .where(and(eq(pipelines_table.workspace_id, workspaceId), eq(pipelines_table.is_default, true), isNull(pipelines_table.deleted_at)))
    .limit(1);

  const pipelineId =
    existing[0]?.id ??
    (
      await dbx
        .insert(pipelines_table)
        .values({ workspace_id: workspaceId, name: DEFAULT_PIPELINE_NAME, sort_order: 0, is_default: true, is_active: true })
        .returning({ id: pipelines_table.id })
    )[0].id;

  const stepMap: Record<string, string> = {};
  for (const step of PIPELINE_STEP_SEED) {
    const found = await dbx
      .select({ id: steps_table.id })
      .from(steps_table)
      .where(and(eq(steps_table.workspace_id, workspaceId), eq(steps_table.slug, step.slug), isNull(steps_table.deleted_at)))
      .limit(1);

    stepMap[step.slug] =
      found[0]?.id ??
      (
        await dbx
          .insert(steps_table)
          .values({
            pipeline_id: pipelineId,
            workspace_id: workspaceId,
            name: step.name,
            slug: step.slug,
            order: step.order,
            color: step.color,
            is_post_sale: step.is_post_sale,
            is_system: true,
            is_active: true,
          })
          .returning({ id: steps_table.id })
      )[0].id;
  }

  const statusMap: Record<string, string> = {};
  for (const status of PIPELINE_STATUS_SEED) {
    const found = await dbx
      .select({ id: status_table.id })
      .from(status_table)
      .where(and(eq(status_table.workspace_id, workspaceId), eq(status_table.slug, status.slug), isNull(status_table.deleted_at)))
      .limit(1);

    statusMap[status.slug] =
      found[0]?.id ??
      (
        await dbx
          .insert(status_table)
          .values({
            workspace_id: workspaceId,
            name: status.name,
            slug: status.slug,
            is_universal: status.is_universal,
            color: status.color ?? null,
            is_system: true,
            is_active: true,
          })
          .returning({ id: status_table.id })
      )[0].id;
  }

  for (const link of PIPELINE_STEP_STATUS_SEED) {
    const stepId = stepMap[link.step_slug];
    const statusId = statusMap[link.status_slug];
    if (stepId && statusId) {
      await dbx.insert(step_statuses).values({ step_id: stepId, status_id: statusId }).onConflictDoNothing();
    }
  }

  return { pipelineId, stepMap, statusMap };
};
