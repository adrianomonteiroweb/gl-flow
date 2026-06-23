'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2Icon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { MultiSelect } from '@/components/commons/multi-select';
import { getUsers } from '@/actions/users';
import { distributeClients, previewDistribution } from '@/actions/clients';
import { normalizeRole } from '@/lib/auth/permissions';

type CandidateUser = { id: string; name: string; role?: string | null };

interface DistributeDialogProps {
  trigger: React.ReactNode;
  onDone?: () => void;
}

type Plan = { total: number; perUser: Record<string, number>; finalTotals: Record<string, number> };

const EMPTY_PLAN: Plan = { total: 0, perUser: {}, finalTotals: {} };

export const DistributeDialog = ({ trigger, onDone }: DistributeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<CandidateUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [plan, setPlan] = useState<Plan>(EMPTY_PLAN);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const load = async () => {
      try {
        setLoadingUsers(true);
        const result = await getUsers({ q: '', page: 1, page_size: 100 });
        const list = (result.data || []) as CandidateUser[];
        const members = list.filter(u => normalizeRole(u.role) === 'member');
        setUsers(members);
        setSelectedUserIds(members.map(u => u.id));
      } catch (error) {
        console.error('Error preparing distribution:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    load();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (selectedUserIds.length === 0) {
      setPlan(EMPTY_PLAN);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoadingPreview(true);
        const result = await previewDistribution({ userIds: selectedUserIds });
        if (!cancelled) {
          setPlan(result || EMPTY_PLAN);
        }
      } catch (error) {
        console.error('Error previewing distribution:', error);
        if (!cancelled) {
          setPlan(EMPTY_PLAN);
        }
      } finally {
        if (!cancelled) {
          setLoadingPreview(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, selectedUserIds]);

  const options = useMemo(
    () => users.map(u => ({ label: u.name, value: u.id })),
    [users]
  );

  const userNameById = useMemo(() => Object.fromEntries(users.map(u => [u.id, u.name])), [users]);

  const preview = useMemo(() => {
    if (plan.total === 0 || selectedUserIds.length === 0) {
      return null;
    }
    return selectedUserIds
      .map(id => ({ id, name: userNameById[id] ?? id, received: plan.perUser[id] ?? 0, total: plan.finalTotals[id] ?? 0 }))
      .sort((a, b) => b.received - a.received);
  }, [plan, selectedUserIds, userNameById]);

  const handleConfirm = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Selecione ao menos um responsável.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await distributeClients({ userIds: selectedUserIds });

      if (result?.status !== 200) {
        toast.error(result?.message ?? 'Não foi possível distribuir os atendimentos.');
        return;
      }

      toast.success(`${result.data?.total ?? 0} atendimento(s) distribuído(s) entre ${selectedUserIds.length} responsável(is).`);
      setOpen(false);
      onDone?.();
      document.dispatchEvent(new Event('clients:updated'));
      document.dispatchEvent(new Event('leads:updated'));
    } catch (error) {
      console.error(error);
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Distribuir atendimentos</DialogTitle>
          <DialogDescription>
            Os atendimentos não iniciados são distribuídos equilibrando a carga: quem tem menos atendimentos abertos recebe mais.
          </DialogDescription>
        </DialogHeader>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-10">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <span className="text-sm font-medium">Responsáveis</span>
              <MultiSelect
                options={options}
                value={selectedUserIds}
                onValueChange={setSelectedUserIds}
                placeholder="Selecione responsáveis"
                showAllOptions
                maxCount={4}
              />
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              {loadingPreview ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2Icon className="h-4 w-4 animate-spin" /> Calculando distribuição...
                </span>
              ) : selectedUserIds.length === 0 ? (
                <span className="text-muted-foreground">Selecione ao menos um responsável.</span>
              ) : plan.total === 0 ? (
                <span className="text-muted-foreground">Nenhum atendimento para distribuir.</span>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{plan.total}</span> atendimento(s) →{' '}
                    <span className="font-medium text-foreground">{selectedUserIds.length}</span> responsável(is):
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {preview?.map(p => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{p.name}</span>
                        <span className="whitespace-nowrap text-muted-foreground">
                          +{p.received} <span className="text-xs">(total {p.total})</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || loadingUsers || loadingPreview || plan.total === 0 || selectedUserIds.length === 0}>
            {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Distribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
