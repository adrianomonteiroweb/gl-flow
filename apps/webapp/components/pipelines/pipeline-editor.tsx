'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { getPipelines, getPipelineStages, createStage, updateStage, reorderStages, reorderPipelines } from '@/actions/pipelines';
import { PipelineTabs } from './pipeline-tabs';
import { StageBoard } from './stage-board';
import { PipelineDialog } from './pipeline-dialog';
import { DeletePipelineDialog } from './delete-pipeline-dialog';
import { DeleteStageDialog } from './delete-stage-dialog';
import type { Pipeline, PipelineStage } from './types';

export const PipelineEditor = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stagesLoading, setStagesLoading] = useState(false);

  const [pipelineDialog, setPipelineDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; pipeline: Pipeline | null }>({
    open: false,
    mode: 'create',
    pipeline: null,
  });
  const [deletePipelineState, setDeletePipelineState] = useState<Pipeline | null>(null);
  const [deleteStageState, setDeleteStageState] = useState<PipelineStage | null>(null);

  const loadPipelines = useCallback(async (preferId?: string) => {
    const result = await getPipelines();
    if (result.success) {
      const list = (result.data as Pipeline[]) ?? [];
      setPipelines(list);
      setSelectedId(prev => {
        const target = preferId ?? prev;
        if (target && list.some(p => p.id === target)) return target;
        return list.find(p => p.is_default)?.id ?? list[0]?.id ?? null;
      });
    } else {
      toast.error(result.error || 'Erro ao carregar pipelines');
    }
    setLoading(false);
  }, []);

  const loadStages = useCallback(async (pipelineId: string | null) => {
    if (!pipelineId) {
      setStages([]);
      return;
    }
    setStagesLoading(true);
    const result = await getPipelineStages(pipelineId);
    if (result.success) {
      setStages((result.data as PipelineStage[]) ?? []);
    } else {
      toast.error(result.error || 'Erro ao carregar etapas');
    }
    setStagesLoading(false);
  }, []);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    loadStages(selectedId);
  }, [selectedId, loadStages]);

  const handleReorderPipelines = async (next: Pipeline[]) => {
    setPipelines(next);
    const result = await reorderPipelines(next.map((p, i) => ({ id: p.id, sort_order: i })));
    if (!result.success) {
      toast.error(result.error || 'Erro ao reordenar pipelines');
      loadPipelines();
    }
  };

  const handleAddStage = async () => {
    if (!selectedId) return;
    const result = await createStage(selectedId, { name: 'Nova etapa' });
    if (result.success) {
      loadStages(selectedId);
    } else {
      toast.error(result.error || 'Erro ao criar etapa');
    }
  };

  const handleRenameStage = async (id: string, name: string) => {
    setStages(prev => prev.map(s => (s.id === id ? { ...s, name } : s)));
    const result = await updateStage(id, { name });

    if (!result.success) {
      toast.error(result.error || 'Erro ao renomear etapa');
      loadStages(selectedId);
    }
  };

  const handleColorChange = async (id: string, color: string) => {
    setStages(prev => prev.map(s => (s.id === id ? { ...s, color } : s)));
    const result = await updateStage(id, { color });

    if (!result.success) {
      toast.error(result.error || 'Erro ao alterar cor');
      loadStages(selectedId);
    }
  };

  const handleReorderStages = async (next: PipelineStage[]) => {
    setStages(next);
    if (!selectedId) return;
    const result = await reorderStages(
      selectedId,
      next.map((s, i) => ({ id: s.id, order: i + 1 }))
    );
    if (!result.success) {
      toast.error(result.error || 'Erro ao reordenar etapas');
      loadStages(selectedId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pipelines e etapas</h1>
        <p className="text-sm text-muted-foreground">
          Crie pipelines, gerencie suas etapas e status. Arraste para reordenar — as alterações são salvas automaticamente.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <PipelineTabs
            pipelines={pipelines}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={handleReorderPipelines}
            onCreate={() => setPipelineDialog({ open: true, mode: 'create', pipeline: null })}
            onRename={pipeline => setPipelineDialog({ open: true, mode: 'edit', pipeline })}
            onDelete={pipeline => setDeletePipelineState(pipeline)}
          />

          {selectedId ? (
            stagesLoading ? (
              <p className="text-sm text-muted-foreground">Carregando etapas...</p>
            ) : (
              <StageBoard
                stages={stages}
                onReorder={handleReorderStages}
                onAddStage={handleAddStage}
                onRenameStage={handleRenameStage}
                onColorChange={handleColorChange}
                onDeleteStage={stage => setDeleteStageState(stage)}
                onStatusesChanged={() => loadStages(selectedId)}
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">Crie seu primeiro pipeline para começar.</p>
          )}
        </>
      )}

      <PipelineDialog
        open={pipelineDialog.open}
        onOpenChange={open => setPipelineDialog(prev => ({ ...prev, open }))}
        mode={pipelineDialog.mode}
        pipeline={pipelineDialog.pipeline}
        onSuccess={createdId => loadPipelines(createdId)}
      />

      <DeletePipelineDialog
        open={!!deletePipelineState}
        onOpenChange={open => { if (!open) setDeletePipelineState(null); }}
        pipeline={deletePipelineState}
        onSuccess={() => { setDeletePipelineState(null); loadPipelines(); }}
      />

      <DeleteStageDialog
        open={!!deleteStageState}
        onOpenChange={open => { if (!open) setDeleteStageState(null); }}
        stage={deleteStageState}
        otherStages={stages.filter(s => s.id !== deleteStageState?.id)}
        onSuccess={() => { setDeleteStageState(null); loadStages(selectedId); }}
      />
    </div>
  );
};
