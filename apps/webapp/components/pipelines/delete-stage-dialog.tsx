'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { AlertTriangle, Bot, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteStage } from '@/actions/pipelines';
import type { PipelineStage } from './types';

interface DeleteStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: PipelineStage | null;
  otherStages: PipelineStage[];
  onSuccess?: () => void;
}

export const DeleteStageDialog = ({ open, onOpenChange, stage, otherStages, onSuccess }: DeleteStageDialogProps) => {
  const [destMode, setDestMode] = useState<'existing' | 'new'>('existing');
  const [targetId, setTargetId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChats = (stage?.chatCount ?? 0) > 0;

  useEffect(() => {
    if (open) {
      setDestMode(otherStages.length > 0 ? 'existing' : 'new');
      setTargetId(otherStages[0]?.id ?? '');
      setNewName('');
      setError(null);
    }
  }, [open, otherStages]);

  const handleDelete = async () => {
    if (!stage) return;
    setError(null);
    setIsLoading(true);

    try {
      let options: { targetStepId?: string; targetStepName?: string } | undefined;

      if (hasChats) {
        if (destMode === 'existing') {
          if (!targetId) {
            setError('Selecione a etapa de destino');
            return;
          }
          options = { targetStepId: targetId };
        } else {
          const trimmed = newName.trim();
          if (!trimmed) {
            setError('Informe o nome da nova etapa');
            return;
          }
          options = { targetStepName: trimmed };
        }
      }

      const result = await deleteStage(stage.id, options);
      if (result.success) {
        toast.success('Etapa excluída');
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error || 'Erro ao excluir etapa');
      }
    } catch {
      setError('Erro ao excluir etapa');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir a etapa “{stage?.name}”?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {stage?.is_system && (
            <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <Bot className="h-4 w-4 shrink-0" />
              <p className="text-xs leading-relaxed">
                Esta etapa faz parte do fluxo da automação. Excluí-la pode interromper o preenchimento automático de etapa e status pelo bot.
              </p>
            </div>
          )}

          {hasChats ? (
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{stage?.chatCount} leads</strong> estão nesta etapa. Mover para:
              </p>

              <div className="inline-flex rounded-md border">
                <button
                  type="button"
                  onClick={() => setDestMode('existing')}
                  className={`px-3 py-1.5 text-xs ${destMode === 'existing' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  Etapa existente
                </button>
                <button
                  type="button"
                  onClick={() => setDestMode('new')}
                  className={`border-l px-3 py-1.5 text-xs ${destMode === 'new' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  Nova etapa
                </button>
              </div>

              {destMode === 'existing' ? (
                otherStages.length > 0 ? (
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherStages.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">Não há outra etapa. Crie uma nova etapa de destino.</p>
                )
              ) : (
                <div className="space-y-1">
                  <Input placeholder="Nome da nova etapa" value={newName} onChange={e => setNewName(e.target.value)} maxLength={255} autoFocus />
                  <p className="text-xs text-muted-foreground">Criamos esta etapa no pipeline e movemos os {stage?.chatCount} leads para ela.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <Trash2 className="mr-1 h-4 w-4" />
            {isLoading ? 'Excluindo...' : hasChats ? 'Excluir e mover' : 'Excluir etapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
