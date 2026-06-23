'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2Icon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Button } from '@workspace/ui/components/button';
import SubmitButton from '@workspace/ui/components/submit-button';

import { getPipelines } from '@/actions/pipelines';
import { getTeam, setTeamPipelines } from '@/actions/teams';

import type { Pipeline } from '@/components/pipelines/types';

type Props = {
  open: boolean;
  teamId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export const TeamPipelinesDialog = ({ open, teamId, onOpenChange, onSaved }: Props) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !teamId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [pipelinesRes, teamRes] = await Promise.all([
        getPipelines(),
        getTeam(teamId),
      ]);

      if (cancelled) {
        return;
      }

      if (pipelinesRes.success) {
        setPipelines((pipelinesRes.data as Pipeline[]) ?? []);
      }

      if (teamRes.success && teamRes.data) {
        const pipelineIds = (teamRes.data as any).pipelines?.map((p: any) => p.pipeline_id) ?? [];
        setSelected(new Set(pipelineIds));
      }

      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, teamId]);

  const toggle = (pipelineId: string) => {
    setSelected(prev => {
      const next = new Set(prev);

      if (next.has(pipelineId)) {
        next.delete(pipelineId);
      } else {
        next.add(pipelineId);
      }

      return next;
    });
  };

  const handleSave = async () => {
    if (!teamId) {
      return;
    }

    setSubmitting(true);
    const res = await setTeamPipelines(teamId, Array.from(selected));

    if (res.success) {
      toast.success('Pipelines atualizados.');
      onSaved();
    } else {
      toast.error(res.error || 'Erro ao atualizar pipelines');
    }

    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Pipelines do time</DialogTitle>
          <DialogDescription>Selecione os pipelines em que este time atua.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pipelines.length === 0 ? (
          <p className="py-6 text-sm text-center text-muted-foreground">Nenhum pipeline encontrado.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1 py-2">
            {pipelines.map(pipeline => (
              <label
                key={pipeline.id}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(pipeline.id)}
                  onCheckedChange={() => toggle(pipeline.id)}
                  disabled={submitting}
                />
                <span className="text-sm font-medium">{pipeline.name}</span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <SubmitButton isSubmitting={submitting} onClick={handleSave} disabled={loading}>
            Salvar
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
