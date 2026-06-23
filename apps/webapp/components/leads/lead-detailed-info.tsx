'use client';

import { useState } from 'react';
import { Pencil, AlertCircle, X, Trash2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { LossReasonModal } from '@/components/loss-reasons/loss-reason-modal';
import { updateLeadLossReason, updateLeadStepBySlug } from '@/actions/leads';
import { toast } from 'sonner';

interface LeadDetailedInfoProps {
  leadId: string;
  chatId?: string;
  lossReason?: string | null;
  onSuccess?: (lossReason: string | null) => void;
}

const parseLossReason = (lossReason: string | null | undefined): { reason: string; observation: string | null } => {
  if (!lossReason) return { reason: '', observation: null };

  const separator = ' — ';
  const separatorIndex = lossReason.indexOf(separator);

  if (separatorIndex === -1) return { reason: lossReason, observation: null };

  return {
    reason: lossReason.substring(0, separatorIndex),
    observation: lossReason.substring(separatorIndex + separator.length),
  };
};

export const LeadDetailedInfo = ({ leadId, chatId, lossReason, onSuccess }: LeadDetailedInfoProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const { reason, observation } = parseLossReason(lossReason);
  const hasLossReason = !!lossReason;

  const handleEdit = () => {
    setModalOpen(true);
  };

  const handleConfirm = async () => {
    setModalOpen(false);

    if (chatId) {
      try {
        await updateLeadStepBySlug(leadId, 'closed', 'negociacao_perdida');
      } catch {
        console.error('Error updating lead step');
      }
    }

    onSuccess?.(null);
    window.location.reload();
  };

  const handleCancel = () => {
    setModalOpen(false);
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const result = await updateLeadLossReason(leadId, null);
      if (!result.success) {
        toast.error(result.error || 'Erro ao remover motivo');
        return;
      }

      if (chatId) {
        await updateLeadStepBySlug(leadId, 'negotiation', 'em_atendimento');
      }

      toast.success('Motivo de perda removido');
      onSuccess?.(null);
      window.location.reload();
    } catch {
      toast.error('Erro ao remover motivo de perda');
    } finally {
      setIsRemoving(false);
      setConfirmRemoveOpen(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div
        className="rounded-lg border border-border transition-colors hover:border-border/80"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Motivo de perda</span>
          </div>
          <div className="flex items-center gap-0.5" role="group" aria-label="Ações do motivo de perda">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              onClick={handleEdit}
              type="button"
              aria-label="Editar motivo de perda"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {hasLossReason && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 text-destructive hover:text-destructive transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setConfirmRemoveOpen(true)}
                type="button"
                aria-label={`Remover motivo de perda: ${reason}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="w-full text-left px-3 pb-3 pt-1 rounded-b-lg hover:bg-muted/50 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={handleEdit}
          aria-label={hasLossReason ? `Motivo: ${reason}. Clique para editar` : 'Selecionar motivo de perda'}
        >
          {hasLossReason ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground leading-snug">{reason}</p>
              {observation && (
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  <span className="sr-only">Observação: </span>
                  {observation}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum motivo selecionado</p>
          )}
        </button>
      </div>

      <LossReasonModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        leadId={leadId}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover motivo de perda</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Tem certeza que deseja remover o motivo de perda <strong className="text-foreground">&quot;{reason}&quot;</strong> deste lead?
                </p>
                <p>
                  Ao confirmar, o lead voltará para a etapa <strong className="text-foreground">Negociação</strong> com status <strong className="text-foreground">Em Atendimento</strong>.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={isRemoving}>
              {isRemoving ? 'Removendo...' : 'Confirmar remoção'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
