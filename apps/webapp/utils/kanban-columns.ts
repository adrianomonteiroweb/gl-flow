export interface StageStatus {
  id: string;
  name: string;
  slug: string | null;
  is_active?: boolean;
  is_universal?: boolean;
  color?: string | null;
}

export interface Stage {
  id: string;
  name: string;
  slug: string | null;
  color?: string | null;
  is_post_sale?: boolean;
  statuses?: StageStatus[];
  [key: string]: any;
}

export interface KanbanColumn {
  id: string;
  label: string;
  configKey?: string;
  color?: string | null;
  realStep: string;
  realStatus?: string;
  isLost: boolean;
  isPostSale: boolean;
}

export interface ClosedInfo {
  stepId: string;
  wonStatusId?: string;
  lostStatusId?: string;
}

const CLOSED_SLUG = 'closed';
const WON_STATUS_SLUG = 'negociacao_ganha';
const LOST_STATUS_SLUG = 'negociacao_perdida';

export const buildKanbanColumns = (stages: Stage[]): { columns: KanbanColumn[]; closedInfo: ClosedInfo | null } => {
  const closedStage = stages.find(s => s.slug === CLOSED_SLUG);
  const wonStatusId = closedStage?.statuses?.find(st => st.slug === WON_STATUS_SLUG)?.id;
  const lostStatusId = closedStage?.statuses?.find(st => st.slug === LOST_STATUS_SLUG)?.id;
  const closedInfo: ClosedInfo | null = closedStage ? { stepId: closedStage.id, wonStatusId, lostStatusId } : null;

  const columns: KanbanColumn[] = [];

  stages.forEach(stage => {
    if (stage.slug === CLOSED_SLUG) {
      columns.push({
        id: 'closed_won',
        label: 'Fechado – Ganho',
        configKey: 'closed_won',
        color: stage.color,
        realStep: stage.id,
        realStatus: wonStatusId,
        isLost: false,
        isPostSale: !!stage.is_post_sale,
      });
      columns.push({
        id: 'closed_lost',
        label: 'Fechado – Perdido',
        configKey: 'closed_lost',
        color: 'red',
        realStep: stage.id,
        realStatus: lostStatusId,
        isLost: true,
        isPostSale: !!stage.is_post_sale,
      });

      return;
    }

    columns.push({
      id: stage.id,
      label: stage.name,
      configKey: stage.slug ?? undefined,
      color: stage.color,
      realStep: stage.id,
      isLost: false,
      isPostSale: !!stage.is_post_sale,
    });
  });

  return { columns, closedInfo };
};

export const resolveLeadColumnId = (
  chatStep: string | undefined,
  chatStatus: string | undefined,
  closedInfo: ClosedInfo | null
): string | undefined => {
  if (closedInfo && chatStep === closedInfo.stepId) {
    return chatStatus === closedInfo.lostStatusId ? 'closed_lost' : 'closed_won';
  }

  return chatStep;
};
