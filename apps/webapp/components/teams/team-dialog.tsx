'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Button } from '@workspace/ui/components/button';
import SubmitButton from '@workspace/ui/components/submit-button';

import { createTeam, updateTeam } from '@/actions/teams';

import type { Team } from './types';

type Props = {
  open: boolean;
  team: Team | null;
  onOpenChange: (open: boolean) => void;
  onCreated: (teamId: string) => void;
  onUpdated: () => void;
};

export const TeamDialog = ({ open, team, onOpenChange, onCreated, onUpdated }: Props) => {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!team;

  useEffect(() => {
    if (open) {
      setName(team?.name ?? '');
    }
  }, [open, team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();

    if (!trimmed) {
      toast.error('O nome do time é obrigatório.');
      return;
    }

    setSubmitting(true);

    if (isEdit) {
      const res = await updateTeam(team.id, { name: trimmed });

      if (res.success) {
        toast.success('Time atualizado.');
        onOpenChange(false);
        onUpdated();
      } else {
        toast.error(res.error || 'Erro ao atualizar time');
      }
    } else {
      const res = await createTeam({ name: trimmed });

      if (res.success) {
        toast.success('Time criado.');
        onOpenChange(false);
        onCreated((res.data as any).id);
      } else {
        toast.error(res.error || 'Erro ao criar time');
      }
    }

    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar time' : 'Novo time'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Altere o nome do time.' : 'Dê um nome ao time. Em seguida, adicione membros e vincule pipelines.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="team-name">Nome</Label>
            <Input
              id="team-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Vendas, Suporte, Onboarding"
              autoFocus
              disabled={submitting}
              className="mt-1.5"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <SubmitButton isSubmitting={submitting} disabled={!name.trim()}>
              {isEdit ? 'Salvar' : 'Criar time'}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
