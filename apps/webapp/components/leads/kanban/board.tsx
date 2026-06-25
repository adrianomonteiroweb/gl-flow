'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { MoveHorizontal } from 'lucide-react';
import { Progress } from '@workspace/ui/components/progress';
import { cn } from '@workspace/ui/lib/utils';
import { getStepsWithStatuses } from '@/actions/steps';
import { buildKanbanColumns, resolveLeadColumnId, type ClosedInfo, type KanbanColumn as KanbanColumnDef, type Stage } from '@/utils/kanban-columns';
import type { LeadItem } from '@/components/leads/lead-card-content';
import { LeadDetailsSurface } from '@/components/leads/lead-details-surface';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import { useScrollProgress } from '@/hooks/use-scroll-progress';

import { KanbanColumn } from './column';

interface KanbanBoardProps {
  leads: LeadItem[];
  loading?: boolean;
  pipelineId?: string | null;
  onStepChange?: (leadId: string, newStep: string, newStatus?: string, isLost?: boolean) => void;
  loadedAt: string;
  stepFilter?: string[];
  onUpdated?: () => void;
}

export const KanbanBoard = ({ leads, loading = false, pipelineId, onStepChange, loadedAt, stepFilter, onUpdated }: KanbanBoardProps) => {
  const [leadsState, setLeadsState] = useState<LeadItem[]>(leads);
  const [columns, setColumns] = useState<KanbanColumnDef[]>([]);
  const [closedInfo, setClosedInfo] = useState<ClosedInfo | null>(null);
  const [isLoadingSteps, setIsLoadingSteps] = useState(true);

  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [detailsTab, setDetailsTab] = useState<string | undefined>(undefined);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const optimisticUpdateRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        setIsLoadingSteps(true);
        const result = await getStepsWithStatuses(pipelineId ?? undefined);

        if (result.success && result.data) {
          const { columns: built, closedInfo: builtClosedInfo } = buildKanbanColumns(result.data as Stage[]);
          setColumns(built);
          setClosedInfo(builtClosedInfo);
        } else {
          setColumns([]);
          setClosedInfo(null);
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
    const grouped: Record<string, LeadItem[]> = {};

    columns.forEach(column => {
      grouped[column.id] = [];
    });

    leadsState.forEach(lead => {
      const resolved = resolveLeadColumnId(lead.chat?.step, lead.chat?.status, closedInfo);
      const key = resolved && grouped[resolved] !== undefined ? resolved : columns[0]?.id;

      if (key) {
        (grouped[key] ??= []).push(lead);
      }
    });

    return grouped;
  }, [leadsState, columns, closedInfo]);

  const visibleColumns = useMemo(
    () => (stepFilter?.length ? columns.filter(c => stepFilter.includes(c.id)) : columns),
    [stepFilter, columns]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const { isPanning, onPointerDown, onPointerMove, onPointerUp } = useDragScroll({ scrollRef });
  const { progress, isOverflowing, onScroll, recompute } = useScrollProgress({ scrollRef });

  useEffect(() => {
    recompute();
  }, [visibleColumns, leadsByColumn, recompute]);

  const applyMove = useCallback(
    (leadId: string, target: KanbanColumnDef) => {
      const leadIndex = leadsState.findIndex(l => l.lead?.id === leadId);

      if (leadIndex === -1) {
        return;
      }

      const lead = leadsState[leadIndex];

      if (!lead || !lead.lead) {
        return;
      }

      const currentColumnId = resolveLeadColumnId(lead.chat?.step, lead.chat?.status, closedInfo);

      if (currentColumnId === target.id) {
        return;
      }

      const updatedLeads = [...leadsState];
      updatedLeads[leadIndex] = {
        ...lead,
        chat: lead.chat
          ? {
              ...lead.chat,
              step: target.realStep,
              status: target.realStatus ?? lead.chat.status,
              id: lead.chat.id || '',
            }
          : {
              id: '',
              step: target.realStep,
              status: target.realStatus,
            },
      };
      setLeadsState(updatedLeads);
      optimisticUpdateRef.current = leadId;

      if (onStepChange) {
        onStepChange(leadId, target.realStep, target.realStatus, target.isLost);
      }
    },
    [leadsState, onStepChange, closedInfo]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || !active) {
        return;
      }

      const leadId = active.id as string;
      const target = columns.find(c => c.id === (over.id as string));

      if (!target) {
        return;
      }

      applyMove(leadId, target);
    },
    [columns, applyMove]
  );

  const handleMoveStage = useCallback(
    (item: LeadItem, target: KanbanColumnDef) => {
      applyMove(item.lead.id, target);
    },
    [applyMove]
  );

  const handleOpenDetails = useCallback((item: LeadItem, tab?: string) => {
    const chatId = item.chat?.id;

    if (chatId) {
      sessionStorage.setItem(`leads-read-${chatId}`, new Date().toISOString());
    }

    setSelectedLead(item);
    setDetailsTab(tab);
    setDetailsOpen(true);
  }, []);

  useEffect(() => {
    if (optimisticUpdateRef.current === null) {
      setLeadsState(leads);
    } else {
      optimisticUpdateRef.current = null;
    }
  }, [leads]);

  if (isLoadingSteps) {
    return (
      <div className="w-full overflow-x-auto rounded-lg border border-border">
        <div className="p-8 text-center text-muted-foreground">Carregando etapas...</div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      {isOverflowing && (
        <div className="-mx-4 mb-2 flex items-center gap-2 px-4 md:mx-0 md:px-0">
          <MoveHorizontal className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          <Progress
            value={progress * 100}
            aria-label="Progresso de rolagem das etapas do pipeline"
            className="h-2 flex-1 bg-muted"
          />
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        className={cn(
          '-mx-4 w-screen overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:w-full md:px-0',
          isOverflowing && 'md:cursor-grab',
          isPanning && 'md:cursor-grabbing md:select-none'
        )}>
        <div className="flex snap-x snap-mandatory gap-3 md:min-w-full md:snap-none md:gap-4">
          {visibleColumns.map(column => (
            <KanbanColumn
              key={column.id}
              step={{ id: column.id, label: column.label, configKey: column.configKey, color: column.color }}
              leads={leadsByColumn[column.id] || []}
              loading={loading}
              loadedAt={loadedAt}
              columns={columns}
              closedInfo={closedInfo}
              onUpdated={onUpdated}
              onOpenDetails={handleOpenDetails}
              onMoveStage={handleMoveStage}
            />
          ))}
        </div>
      </div>

      <LeadDetailsSurface item={selectedLead} tab={detailsTab} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </DndContext>
  );
};
