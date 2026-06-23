'use client';

import { useState } from 'react';
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
import { deleteLossReason } from '@/actions/loss-reasons';

interface DeleteLossReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: { id: string; name: string } | null;
  onSuccess?: () => void;
}

export const DeleteLossReasonDialog = ({ open, onOpenChange, reason, onSuccess }: DeleteLossReasonDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!reason) return;
    setIsLoading(true);

    try {
      const result = await deleteLossReason(reason.id);
      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir motivo de perda</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o motivo <strong>&quot;{reason?.name}&quot;</strong>? Essa ação não pode ser
            desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isLoading ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
