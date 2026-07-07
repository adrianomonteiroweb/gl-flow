'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, ListFilter, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Toggle } from '@workspace/ui/components/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { cn } from '@workspace/ui/lib/utils';
import { getLeads, updateLeadStep } from '@/actions/leads';
import { getAvailablePipelines } from '@/actions/pipelines';
import { useSearchParams } from '@/hooks/use-search-params';
import type { Pipeline } from '@/components/pipelines/types';
import { useLeadsSSE } from '@/hooks/use-leads-sse';
import { useLeadsPreferences } from '@/hooks/use-leads-preferences';
import { useSessionContext } from '@/contexts/session';
import { useOfflineSyncContext } from '@/contexts/offline-sync';
import { canAssignLeads } from '@/lib/auth/permissions';
import { getToneClasses } from '@/lib/tone-colors';
import { LossReasonModal } from '@/components/loss-reasons/loss-reason-modal';
import { DistributeDialog } from '@/components/clients/distribute-dialog';
import { OfflineIndicator } from '@/components/commons/offline-indicator';

import { LeadsDataTable } from './datatable/data-table';
import { KanbanBoard } from './kanban/board';
import { ViewToggle, ViewType } from './view-toggle';
import { LeadsFilterBar } from './leads-filter-bar';

export function LeadsContainer() {
  const { mounted, view, setView, pipelineId: selectedPipelineId, setPipelineId: setSelectedPipelineId, teamFilter, setTeamFilter, filtersVisible, setFiltersVisible } = useLeadsPreferences();
  const [narrowFiltersOpen, setNarrowFiltersOpen] = useState(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  const [loadedAt] = useState(() => {
    const STORAGE_KEY = 'leads-loaded-at';
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;

    if (stored) {
      return stored;
    }

    const now = new Date().toISOString();

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, now);
    }

    return now;
  });

  const [kanbanData, setKanbanData] = useState<{ data: any[]; count: number }>({ data: [], count: 0 });
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [teamPipelineIds, setTeamPipelineIds] = useState<string[]>([]);
  const [pendingLostChange, setPendingLostChange] = useState<{
    leadId: string;
    chatId: string;
    step: string;
    status: string;
  } | null>(null);
  const { params } = useSearchParams();
  const { user } = useSessionContext();
  const { is_online, addLeadStepToQueue } = useOfflineSyncContext();

  const canDistribute = canAssignLeads(user?.role);
  const hasTeamFilter = teamPipelineIds.length > 0;
  const teamFilterActive = teamFilter ?? hasTeamFilter;

  const q = params.q || '';
  const steps = params.steps ? String(params.steps).split(',').filter(Boolean) : [];
  const taskAlerts = params.taskAlerts ? String(params.taskAlerts).split(',').filter(Boolean) : [];

  useEffect(() => {
    const check = () => setIsNarrowScreen(window.innerWidth < 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showFilters = mounted ? (isNarrowScreen ? narrowFiltersOpen : (filtersVisible ?? true)) : false;
  const activeFilterCount = steps.length + taskAlerts.length;

  const visiblePipelines = useMemo(() => {
    if (!teamFilterActive || teamPipelineIds.length === 0) {
      return pipelines;
    }

    return pipelines.filter(p => teamPipelineIds.includes(p.id));
  }, [pipelines, teamPipelineIds, teamFilterActive]);

  const activePipelineIds = useMemo(() => {
    if (!teamFilterActive || teamPipelineIds.length === 0) {
      return undefined;
    }

    return teamPipelineIds;
  }, [teamFilterActive, teamPipelineIds]);

  useLeadsSSE();

  useEffect(() => {
    let active = true;

    (async () => {
      const res = await getAvailablePipelines();

      if (!active || !res.success || !res.data) {
        return;
      }

      const { pipelines: rawList, teamPipelineIds: teamIds } = res.data;
      setPipelines(rawList as Pipeline[]);
      setTeamPipelineIds(teamIds);
    })();

    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pipelines.length === 0) {
      return;
    }

    const pool = teamFilterActive ? pipelines.filter(p => teamPipelineIds.includes(p.id)) : pipelines;
    const currentStillVisible = !!selectedPipelineId && pool.some(p => p.id === selectedPipelineId);

    if (!currentStillVisible) {
      setSelectedPipelineId(pool[0]?.id ?? pipelines[0]?.id ?? null);
    }
  }, [pipelines, teamPipelineIds, teamFilterActive, selectedPipelineId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchKanbanData = useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }

    setKanbanLoading(true);
    setError(null);

    try {
      const res = await getLeads({
        q,
        steps,
        taskAlerts,
        pipelineId: selectedPipelineId ?? undefined,
        page: 1,
        page_size: 1000,
      });

      if (!res || !res.data) {
        throw new Error('Erro ao carregar leads');
      }

      setKanbanData(res);
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao carregar leads';
      console.error('Error fetching leads:', error);
      setError(errorMessage);
      toast.error(errorMessage);
      setKanbanData({ data: [], count: 0 });
    } finally {
      setKanbanLoading(false);
    }
  }, [q, steps.join(','), taskAlerts.join(','), selectedPipelineId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (view === 'kanban') {
      fetchKanbanData();
    }

    const interval = setInterval(() => {
      if (view === 'kanban') {
        fetchKanbanData();
      }
    }, 60000);

    document.addEventListener('leads:updated', fetchKanbanData);

    return () => {
      clearInterval(interval);
      document.removeEventListener('leads:updated', fetchKanbanData);
    };
  }, [view, fetchKanbanData]);

  const handleStepChange = async (leadId: string, newStep: string, newStatus?: string, isLost?: boolean) => {
    try {
      if (!leadId || !newStep) {
        toast.error('Dados inválidos');
        return;
      }

      const lead = kanbanData.data?.find((item: any) => item.lead?.id === leadId);

      if (!lead) {
        toast.error('Lead não encontrado');
        return;
      }

      if (!lead.chat?.id) {
        toast.error('Chat do lead não encontrado');
        return;
      }

      if (isLost && newStatus) {
        setPendingLostChange({
          leadId,
          chatId: lead.chat.id,
          step: newStep,
          status: newStatus,
        });

        return;
      }

      if (!is_online) {
        addLeadStepToQueue(leadId, { lead_id: leadId, step_id: newStep, status_id: newStatus, lead_name: lead.lead?.name });
        toast.success('Etapa salva localmente. Será sincronizada ao reconectar.');
        return;
      }

      const result = await updateLeadStep(leadId, newStep, newStatus);

      if (result.success) {
        toast.success('Etapa atualizada com sucesso');
        fetchKanbanData();
      } else {
        toast.error(result.error || 'Erro ao atualizar etapa');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro ao atualizar etapa';
      console.error('Error updating step:', error);
      toast.error(errorMessage);
    }
  };

  const handleLostConfirm = async () => {
    if (!pendingLostChange) {
      return;
    }

    try {
      const result = await updateLeadStep(pendingLostChange.leadId, pendingLostChange.step, pendingLostChange.status);

      if (result.success) {
        toast.success('Negociação marcada como perdida');
        fetchKanbanData();
      } else {
        toast.error(result.error || 'Erro ao atualizar etapa');
      }
    } catch (error: any) {
      console.error('Error updating step:', error);
      toast.error(error?.message || 'Erro ao atualizar etapa');
    } finally {
      setPendingLostChange(null);
    }
  };

  const handleLostOfflineConfirm = (lossReason: string) => {
    if (!pendingLostChange) {
      return;
    }

    const lead = kanbanData.data?.find((item: any) => item.lead?.id === pendingLostChange.leadId);

    addLeadStepToQueue(pendingLostChange.leadId, {
      lead_id: pendingLostChange.leadId,
      step_id: pendingLostChange.step,
      status_id: pendingLostChange.status,
      loss_reason: lossReason,
      lead_name: lead?.lead?.name,
    });

    toast.success('Negociação salva localmente. Será sincronizada ao reconectar.');
    setPendingLostChange(null);
  };

  const handleLostCancel = () => {
    setPendingLostChange(null);

    if (is_online) {
      fetchKanbanData();
    }
  };

  const handleViewChange = (newView: ViewType) => {
    setView(newView);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="hidden sm:block text-lg font-semibold text-foreground">
          {view === 'list' ? 'Visualização em Lista' : 'Visualização em Kanban'}
        </h2>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <OfflineIndicator />

          {view === 'kanban' && visiblePipelines.length > 0 && (
            <Select value={selectedPipelineId ?? undefined} onValueChange={setSelectedPipelineId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Pipeline" />
              </SelectTrigger>
              <SelectContent>
                {visiblePipelines.map(pipeline => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {canDistribute && (
            <DistributeDialog
              onDone={fetchKanbanData}
              trigger={
                <Button type="button" variant="outline" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline">Distribuir atendimentos</span>
                  <span className="lg:hidden">Distribuir</span>
                </Button>
              }
            />
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isNarrowScreen) {
                setNarrowFiltersOpen(prev => !prev);
              } else {
                setFiltersVisible(!showFilters);
              }
            }}
            aria-expanded={showFilters}
            className="gap-2">
            <ListFilter className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="h-3.5 w-3.5 opacity-60" /> : <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
          </Button>

          <ViewToggle onViewChange={handleViewChange} />
        </div>
      </div>

      {showFilters && (
        <LeadsFilterBar>
          {hasTeamFilter && (
            <Toggle
              size="sm"
              variant="outline"
              pressed={teamFilterActive}
              onPressedChange={setTeamFilter}
              className={cn(
                'gap-1.5 rounded-full px-3 h-7 text-xs font-medium border transition-colors',
                teamFilterActive
                  ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/15 hover:text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}>
              <Users className="h-3 w-3" />
              Meus times
            </Toggle>
          )}
        </LeadsFilterBar>
      )}

      {error && view === 'kanban' && (
        <div className={cn('flex items-center justify-between rounded-lg p-4', getToneClasses('danger').soft)}>
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-sm text-destructive-foreground">!</div>
            <p className="text-sm">{error}</p>
          </div>

          <button
            onClick={() => setError(null)}
            className="rounded text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Fechar
          </button>
        </div>
      )}

      {view === 'list' ? (
        <LeadsDataTable loadedAt={loadedAt} pipelineIds={activePipelineIds} />
      ) : (
        <KanbanBoard
          leads={kanbanData.data || []}
          loading={kanbanLoading}
          pipelineId={selectedPipelineId}
          onStepChange={handleStepChange}
          loadedAt={loadedAt}
          stepFilter={steps}
          onUpdated={fetchKanbanData}
        />
      )}

      {pendingLostChange && (
        <LossReasonModal
          open={!!pendingLostChange}
          onOpenChange={(open: boolean) => {
            if (!open) {
              handleLostCancel();
            }
          }}
          leadId={pendingLostChange.leadId}
          onConfirm={handleLostConfirm}
          onOfflineConfirm={handleLostOfflineConfirm}
          onCancel={handleLostCancel}
        />
      )}
    </div>
  );
}
