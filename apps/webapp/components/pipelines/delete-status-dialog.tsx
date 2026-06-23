'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { AlertTriangle, Bot, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { removeStatusFromStage } from '@/actions/pipelines';
import type { PipelineStatus } from './types';

interface DeleteStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepId: string;
  status: PipelineStatus | null;
  siblingStatuses: PipelineStatus[];
  chatCount: number;
  isSystem: boolean;
  onSuccess?: () => void;
}

export const DeleteStatusDialog = ({
  open,
  onOpenChange,
  stepId,
  status,
  siblingStatuses,
  chatCount,
  isSystem,
  onSuccess,
}: DeleteStatusDialogProps) => {
  const [destMode, setDestMode] = useState<'existing' | 'new'>('existing');
  const [targetId, setTargetId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDestMode(siblingStatuses.length > 0 ? 'existing' : 'new');
      setTargetId(siblingStatuses[0]?.id ?? '');
      setNewName('');
      setError(null);
    }
  }, [open, siblingStatuses]);

  const handleDelete = async () => {
    if (!status) return;
    setError(null);
    setIsLoading(true);

    try {
      let options: { targetStatusId?: string; targetStatusName?: string };
      if (destMode === 'existing') {
        if (!targetId) {
          setError('Selecione o status de destino');
          return;
        }
        options = { targetStatusId: targetId };
      } else {
        const trimmed = newName.trim();
        if (!trimmed) {
          setError('Informe o nome do novo status');
          return;
        }
        options = { targetStatusName: trimmed };
      }

      const result = await removeStatusFromStage(stepId, status.id, options);
      if (result.success) {
        toast.success('Status excluído');
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error || 'Erro ao excluir status');
      }
    } catch {
      setError('Erro ao excluir status');
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
            Excluir o status “{status?.name}”?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isSystem && (
            <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <Bot className="h-4 w-4 shrink-0" />
              <p className="text-xs leading-relaxed">Este status é usado pela automação. Excluí-lo pode interromper o preenchimento automático pelo bot.</p>
            </div>
          )}

          <p className="text-sm">
            <strong>{chatCount} leads</strong> usam este status. Mover para:
          </p>

          <div className="inline-flex rounded-md border">
            <button
              type="button"
              onClick={() => setDestMode('existing')}
              className={`px-3 py-1.5 text-xs ${destMode === 'existing' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              Status existente
            </button>
            <button
              type="button"
              onClick={() => setDestMode('new')}
              className={`border-l px-3 py-1.5 text-xs ${destMode === 'new' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              Novo status
            </button>
          </div>

          {destMode === 'existing' ? (
            siblingStatuses.length > 0 ? (
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {siblingStatuses.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">Não há outro status. Crie um novo de destino.</p>
            )
          ) : (
            <Input placeholder="Nome do novo status" value={newName} onChange={e => setNewName(e.target.value)} maxLength={255} autoFocus />
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
            {isLoading ? 'Excluindo...' : 'Excluir e mover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
