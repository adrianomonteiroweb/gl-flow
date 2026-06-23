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
import { toast } from 'sonner';
import { deletePipeline } from '@/actions/pipelines';
import type { Pipeline } from './types';

interface DeletePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline | null;
  onSuccess?: () => void;
}

export const DeletePipelineDialog = ({ open, onOpenChange, pipeline, onSuccess }: DeletePipelineDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!pipeline) return;
    setIsLoading(true);

    try {
      const result = await deletePipeline(pipeline.id);
      if (result.success) {
        toast.success('Pipeline excluído');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Erro ao excluir pipeline');
      }
    } catch {
      toast.error('Erro ao excluir pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir o pipeline “{pipeline?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Os leads deste pipeline serão movidos para o pipeline padrão. Esta ação não pode ser desfeita.
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
