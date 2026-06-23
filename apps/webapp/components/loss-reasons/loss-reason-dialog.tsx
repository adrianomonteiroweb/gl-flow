'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { createLossReason, updateLossReason } from '@/actions/loss-reasons';

interface LossReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  reason?: { id: string; name: string } | null;
  onSuccess?: () => void;
}

export const LossReasonDialog = ({ open, onOpenChange, mode, reason, onSuccess }: LossReasonDialogProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(mode === 'edit' && reason ? reason.name : '');
      setError(null);
    }
  }, [open, mode, reason]);

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
        mode === 'edit' && reason
          ? await updateLossReason(reason.id, { name: trimmed })
          : await createLossReason({ name: trimmed });

      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
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
          <DialogTitle>{mode === 'edit' ? 'Editar motivo de perda' : 'Novo motivo de perda'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="loss-reason-name">Nome</Label>
              <Input
                id="loss-reason-name"
                placeholder="Ex: Cliente fora do perfil"
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
