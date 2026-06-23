import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { db } from './db';
import { pipelines_table, steps_table, status_table, step_statuses } from './schema';

export const DEFAULT_PIPELINE_NAME = 'Comercial';

type StepSeed = { slug: string; name: string; order: string; color: string };
type StatusSeed = { slug: string; name: string; is_universal: boolean };
type LinkSeed = { step_slug: string; status_slug: string };

export const PIPELINE_STEP_SEED: StepSeed[] = [
  { slug: 'new', name: 'Novo', order: '1', color: 'blue' },
  { slug: 'qualified', name: 'Qualificação', order: '2', color: 'emerald' },
  { slug: 'negotiation', name: 'Negociação', order: '3', color: 'purple' },
  { slug: 'closed', name: 'Fechado', order: '4', color: 'green' },
];

export const PIPELINE_STATUS_SEED: StatusSeed[] = [
  { slug: 'novo', name: 'Novo', is_universal: true },
  { slug: 'pending', name: 'Pendente', is_universal: true },
  { slug: 'em_atendimento', name: 'Em Atendimento', is_universal: true },
  { slug: 'aguardando_cliente', name: 'Aguardando Cliente', is_universal: true },
  { slug: 'em_analise', name: 'Em Análise', is_universal: true },
  { slug: 'concluido', name: 'Concluído', is_universal: true },
  { slug: 'encerrado', name: 'Encerrado', is_universal: true },
  { slug: 'aguardando_resposta', name: 'Aguardando Resposta', is_universal: false },
  { slug: 'analise_viabilidade', name: 'Análise Viabilidade', is_universal: false },
  { slug: 'sem_viabilidade', name: 'Sem Viabilidade', is_universal: false },
  { slug: 'viavel_tecnicamente', name: 'Viável Tecnicamente', is_universal: false },
  { slug: 'qualificado', name: 'Qualificado', is_universal: false },
  { slug: 'nao_qualificado', name: 'Não Qualificado', is_universal: false },
  { slug: 'proposta_enviada', name: 'Proposta Enviada', is_universal: false },
  { slug: 'em_analise_cliente', name: 'Em Análise (Cliente)', is_universal: false },
  { slug: 'proposta_aceita', name: 'Proposta Aceita', is_universal: false },
  { slug: 'proposta_recusada', name: 'Proposta Recusada', is_universal: false },
  { slug: 'negociacao_iniciada', name: 'Negociação Iniciada', is_universal: false },
  { slug: 'aguardando_decisao', name: 'Aguardando Decisão', is_universal: false },
  { slug: 'aguardando_assinatura', name: 'Aguardando Assinatura', is_universal: false },
  { slug: 'negociacao_perdida', name: 'Negociação Perdida', is_universal: false },
  { slug: 'negociacao_ganha', name: 'Negociação Ganha', is_universal: false },
];

export const PIPELINE_STEP_STATUS_SEED: LinkSeed[] = [
  { step_slug: 'new', status_slug: 'pending' },
  { step_slug: 'new', status_slug: 'em_atendimento' },
  { step_slug: 'new', status_slug: 'aguardando_resposta' },
  { step_slug: 'new', status_slug: 'analise_viabilidade' },
  { step_slug: 'qualified', status_slug: 'sem_viabilidade' },
  { step_slug: 'qualified', status_slug: 'viavel_tecnicamente' },
  { step_slug: 'qualified', status_slug: 'qualificado' },
  { step_slug: 'qualified', status_slug: 'nao_qualificado' },
  { step_slug: 'negotiation', status_slug: 'proposta_enviada' },
  { step_slug: 'negotiation', status_slug: 'em_analise_cliente' },
  { step_slug: 'negotiation', status_slug: 'proposta_aceita' },
  { step_slug: 'negotiation', status_slug: 'proposta_recusada' },
  { step_slug: 'negotiation', status_slug: 'negociacao_iniciada' },
  { step_slug: 'negotiation', status_slug: 'aguardando_decisao' },
  { step_slug: 'negotiation', status_slug: 'aguardando_assinatura' },
  { step_slug: 'closed', status_slug: 'negociacao_perdida' },
  { step_slug: 'closed', status_slug: 'negociacao_ganha' },
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
