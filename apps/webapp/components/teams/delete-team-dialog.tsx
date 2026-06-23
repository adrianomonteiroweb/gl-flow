'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { Button } from '@workspace/ui/components/button';
import SubmitButton from '@workspace/ui/components/submit-button';

import { deleteTeam } from '@/actions/teams';

import type { Team } from './types';

type Props = {
  open: boolean;
  team: Team | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
};

export const DeleteTeamDialog = ({ open, team, onOpenChange, onDeleted }: Props) => {
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!team) {
      return;
    }

    setSubmitting(true);
    const res = await deleteTeam(team.id);

    if (res.success) {
      toast.success('Time excluído.');
      onDeleted();
    } else {
      toast.error(res.error || 'Erro ao excluir time');
    }

    setSubmitting(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir time</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o time <strong>{team?.name}</strong>? Os membros não serão removidos do sistema, apenas desvinculados do time.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <SubmitButton isSubmitting={submitting} onClick={handleDelete} variant="destructive">
            Excluir
          </SubmitButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
