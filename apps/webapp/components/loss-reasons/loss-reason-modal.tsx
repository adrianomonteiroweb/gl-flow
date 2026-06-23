'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Textarea } from '@workspace/ui/components/textarea';
import { Label } from '@workspace/ui/components/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@workspace/ui/components/command';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { cn } from '@workspace/ui/lib/utils';
import { getActiveLossReasons, getAllowFreeformLossReasons } from '@/actions/loss-reasons';
import { updateLeadLossReason } from '@/actions/leads';

interface LossReason {
  id: string;
  name: string;
}

interface LossReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const FREEFORM_ID = '__freeform__';

export const LossReasonModal = ({ open, onOpenChange, leadId, onConfirm, onCancel }: LossReasonModalProps) => {
  const [reasons, setReasons] = useState<LossReason[]>([]);
  const [allowFreeform, setAllowFreeform] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [observation, setObservation] = useState('');
  const [freeformText, setFreeformText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReasons, setIsLoadingReasons] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const isFreeform = selectedReasonId === FREEFORM_ID;

  const selectedReasonLabel = (() => {
    if (!selectedReasonId) return null;
    if (isFreeform) return 'Outro (formato livre)';
    return reasons.find(r => r.id === selectedReasonId)?.name ?? null;
  })();

  const fetchReasons = useCallback(async () => {
    setIsLoadingReasons(true);
    const [reasonsResult, freeformResult] = await Promise.all([
      getActiveLossReasons(),
      getAllowFreeformLossReasons(),
    ]);
    if (reasonsResult.success) setReasons(reasonsResult.data as LossReason[]);
    if (freeformResult.success) setAllowFreeform(freeformResult.data);
    setIsLoadingReasons(false);
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedReasonId(null);
      setObservation('');
      setFreeformText('');
      setError(null);
      fetchReasons();
    }
  }, [open, fetchReasons]);

  const handleConfirm = async () => {
    if (!selectedReasonId) {
      setError('Selecione um motivo de perda');
      return;
    }

    if (isFreeform && !freeformText.trim()) {
      setError('Descreva o motivo de perda');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const reasonName = isFreeform ? freeformText.trim() : selectedReasonLabel!;
      const obs = observation.trim();
      const lossReasonValue = obs ? `${reasonName} — ${obs}` : reasonName;

      const result = await updateLeadLossReason(leadId, lossReasonValue);

      if (!result.success) {
        setError(result.error || 'Erro ao salvar motivo');
        return;
      }

      onConfirm();
      onOpenChange(false);
    } catch {
      setError('Erro ao salvar motivo de perda');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const canConfirm = selectedReasonId && (!isFreeform || freeformText.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={val => { if (!val) handleCancel(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Motivo da perda</DialogTitle>
          <DialogDescription>
            Selecione o motivo pelo qual este negócio foi perdido. Ao confirmar, o lead será movido automaticamente para a etapa <strong className="text-foreground">Fechado</strong> com status <strong className="text-foreground">Negociação Perdida</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Motivo</Label>
            {isLoadingReasons ? (
              <div className="h-10 flex items-center text-sm text-muted-foreground">Carregando motivos...</div>
            ) : (
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between font-normal">
                    {selectedReasonLabel || 'Selecione um motivo...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar motivo..." />
                    <CommandList>
                      <CommandEmpty>Nenhum motivo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {reasons.map(reason => (
                          <CommandItem
                            key={reason.id}
                            value={reason.name}
                            onSelect={() => {
                              setSelectedReasonId(reason.id);
                              setComboboxOpen(false);
                              setError(null);
                            }}>
                            <Check className={cn('mr-2 h-4 w-4', selectedReasonId === reason.id ? 'opacity-100' : 'opacity-0')} />
                            {reason.name}
                          </CommandItem>
                        ))}
                        {allowFreeform && (
                          <CommandItem
                            value="Outro (formato livre)"
                            onSelect={() => {
                              setSelectedReasonId(FREEFORM_ID);
                              setComboboxOpen(false);
                              setError(null);
                            }}>
                            <Check className={cn('mr-2 h-4 w-4', isFreeform ? 'opacity-100' : 'opacity-0')} />
                            Outro (formato livre)
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {isFreeform && (
            <div className="space-y-2">
              <Label htmlFor="freeform-reason">Descreva o motivo</Label>
              <Textarea
                id="freeform-reason"
                placeholder="Descreva o motivo da perda..."
                value={freeformText}
                onChange={e => setFreeformText(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={255}
                autoFocus
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="loss-observation">Observação (opcional)</Label>
            <Textarea
              id="loss-observation"
              placeholder="Adicione detalhes sobre a perda..."
              value={observation}
              onChange={e => setObservation(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={300}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isLoading || !canConfirm}>
            {isLoading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
