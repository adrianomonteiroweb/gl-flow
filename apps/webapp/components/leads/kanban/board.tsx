'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getStepsWithStatuses } from '@/actions/steps';

import { KanbanColumn } from './column';

interface Lead {
  lead: {
    id: string;
    name: string;
    phone: string;
    [key: string]: any;
  };
  chat?: {
    id: string;
    step?: string;
    status?: string;
    assignee_id?: string;
    updated_at?: string;
    [key: string]: any;
  };
  assignee?: {
    id: string;
    name: string;
    [key: string]: any;
  };
  tasks?: { due_date: string; completed_at: string | null }[];
  [key: string]: any;
}

interface KanbanBoardProps {
  leads: Lead[];
  loading?: boolean;
  pipelineId?: string | null;
  onStepChange?: (leadId: string, newStep: string, newStatus?: string, isLost?: boolean) => void;
  loadedAt: string;
  stepFilter?: string[];
  onUpdated?: () => void;
}

interface Column {
  id: string;
  label: string;
  configKey?: string;
  color?: string | null;
  realStep: string;
  realStatus?: string;
}

interface ClosedInfo {
  stepId: string;
  wonStatusId?: string;
  lostStatusId?: string;
}

export const KanbanBoard = ({ leads, loading = false, pipelineId, onStepChange, loadedAt, stepFilter, onUpdated }: KanbanBoardProps) => {
  const [leadsState, setLeadsState] = useState<Lead[]>(leads);
  const [columns, setColumns] = useState<Column[]>([]);
  const [closedInfo, setClosedInfo] = useState<ClosedInfo | null>(null);
  const [isLoadingSteps, setIsLoadingSteps] = useState(true);

  const optimisticUpdateRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        setIsLoadingSteps(true);
        const result = await getStepsWithStatuses(pipelineId ?? undefined);

        if (result.success && result.data) {
          const stages = result.data as any[];
          const closedStage = stages.find(s => s.slug === 'closed');
          const wonStatusId = closedStage?.statuses?.find((st: any) => st.slug === 'negociacao_ganha')?.id;
          const lostStatusId = closedStage?.statuses?.find((st: any) => st.slug === 'negociacao_perdida')?.id;

          setClosedInfo(closedStage ? { stepId: closedStage.id, wonStatusId, lostStatusId } : null);

          const expanded: Column[] = [];
          stages.forEach((s: any) => {
            if (s.slug === 'closed') {
              expanded.push({ id: 'closed_won', label: 'Fechado – Ganho', configKey: 'closed_won', color: s.color, realStep: s.id, realStatus: wonStatusId });
              expanded.push({ id: 'closed_lost', label: 'Fechado – Perdido', configKey: 'closed_lost', color: 'red', realStep: s.id, realStatus: lostStatusId });
            } else {
              expanded.push({ id: s.id, label: s.name, configKey: s.slug ?? undefined, color: s.color, realStep: s.id });
            }
          });

          setColumns(expanded);
        } else {
          setColumns([]);
        }
      } catch (error) {
        console.error('Error fetching steps:', error);
      } finally {
        setIsLoadingSteps(false);
      }
    };

    fetchSteps();
  }, [pipelineId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),

    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const leadsByColumn = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};

    columns.forEach(column => {
      grouped[column.id] = [];
    });

    leadsState.forEach(lead => {
      const stepId = lead.chat?.step;

      if (closedInfo && stepId === closedInfo.stepId) {
        const bucketId = lead.chat?.status === closedInfo.lostStatusId ? 'closed_lost' : 'closed_won';
        (grouped[bucketId] ??= []).push(lead);
        return;
      }

      const key = stepId && grouped[stepId] !== undefined ? stepId : columns[0]?.id;
      if (key) {
        (grouped[key] ??= []).push(lead);
      }
    });

    return grouped;
  }, [leadsState, columns, closedInfo]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || !active) {
        return;
      }

      const leadId = active.id as string;
      const targetColumnId = over.id as string;

      const targetColumn = columns.find(c => c.id === targetColumnId);
      if (!targetColumn) {
        return;
      }

      const leadIndex = leadsState.findIndex(l => l.lead?.id === leadId);
      if (leadIndex === -1) {
        return;
      }

      const lead = leadsState[leadIndex];
      if (!lead || !lead.lead) {
        return;
      }

      const currentColumnId =
        closedInfo && lead.chat?.step === closedInfo.stepId
          ? lead.chat?.status === closedInfo.lostStatusId
            ? 'closed_lost'
            : 'closed_won'
          : lead.chat?.step;

      if (currentColumnId === targetColumnId) {
        return;
      }

      const realStep = targetColumn.realStep;
      const realStatus = targetColumn.realStatus;
      const isLost = targetColumnId === 'closed_lost';

      const updatedLeads = [...leadsState];
      updatedLeads[leadIndex] = {
        ...lead,
        chat: lead.chat
          ? {
              ...lead.chat,
              step: realStep,
              status: realStatus ?? lead.chat.status,
              id: lead.chat.id || '',
            }
          : {
              id: '',
              step: realStep,
              status: realStatus,
            },
      };
      setLeadsState(updatedLeads);
      optimisticUpdateRef.current = leadId;

      if (onStepChange) {
        onStepChange(leadId, realStep, realStatus, isLost);
      }
    },
    [leadsState, onStepChange, columns, closedInfo]
  );

  useEffect(() => {
    if (optimisticUpdateRef.current === null) {
      setLeadsState(leads);
    } else {
      optimisticUpdateRef.current = null;
    }
  }, [leads]);

  if (isLoadingSteps) {
    return (
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <div className="p-8 text-center text-muted-foreground">Carregando etapas...</div>
      </div>
    );
  }

  const visibleColumns = stepFilter?.length ? columns.filter(c => stepFilter.includes(c.id)) : columns;

  const colCount = visibleColumns.length || 1;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
        style={{ gridTemplateColumns: colCount > 2 ? `repeat(${colCount}, minmax(0, 1fr))` : undefined }}>
        {visibleColumns.map(column => (
          <KanbanColumn key={column.id} step={{ id: column.id, label: column.label, configKey: column.configKey, color: column.color }} leads={leadsByColumn[column.id] || []} loading={loading} loadedAt={loadedAt} onUpdated={onUpdated} />
        ))}
      </div>
    </DndContext>
  );
};
