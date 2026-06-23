'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { createPipeline, updatePipeline } from '@/actions/pipelines';
import type { Pipeline } from './types';

interface PipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  pipeline?: Pipeline | null;
  onSuccess?: (pipelineId?: string) => void;
}

export const PipelineDialog = ({ open, onOpenChange, mode, pipeline, onSuccess }: PipelineDialogProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(mode === 'edit' && pipeline ? pipeline.name : '');
      setError(null);
    }
  }, [open, mode, pipeline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const trimmed = name.trim();
      if (!trimmed) {
        setError('Nome é obrigatório');
        return;
      }

      const result =
        mode === 'edit' && pipeline ? await updatePipeline(pipeline.id, { name: trimmed }) : await createPipeline({ name: trimmed });

      if (result.success) {
        onOpenChange(false);
        const createdId = mode === 'create' && result.data ? (result.data as Pipeline).id : pipeline?.id;
        onSuccess?.(createdId);
      } else {
        setError(result.error || 'Erro ao salvar');
      }
    } catch {
      setError('Erro ao salvar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Renomear pipeline' : 'Novo pipeline'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">Nome</Label>
              <Input
                id="pipeline-name"
                placeholder="Ex: Pós-venda"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                maxLength={255}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
