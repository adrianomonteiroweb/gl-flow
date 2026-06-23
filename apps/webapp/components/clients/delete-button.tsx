'use client';

import { inactivateClient, getClientPipelineStatus } from '@/actions/clients';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { UserMinusIcon, Loader2Icon, AlertTriangleIcon } from 'lucide-react';
import SubmitButton from '@workspace/ui/components/submit-button';
import { useEffect, useState } from 'react';

type PipelineStatus = {
  canInactivate: boolean;
  stepLabel: string;
  statusLabel: string;
};

export const InactivateClientButton = ({ client }: any) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);

  useEffect(() => {
    if (!open) {
      setPipelineStatus(null);
      return;
    }

    setLoading(true);
    getClientPipelineStatus(client.id)
      .then((result: any) => {
        if (result?.status === 200) {
          setPipelineStatus({
            canInactivate: result.canInactivate,
            stepLabel: result.stepLabel,
            statusLabel: result.statusLabel,
          });
        } else {
          toast.error(result?.message ?? 'Erro ao verificar status do cliente.');
          setOpen(false);
        }
      })
      .catch(() => {
        toast.error('Erro ao verificar status do cliente.');
        setOpen(false);
      })
      .finally(() => setLoading(false));
  }, [open, client.id]);

  const handleAction = async () => {
    try {
      const result = await inactivateClient(client.id);

      if (result?.status !== 200) {
        toast.error(result?.message ?? 'Ops! Ocorreu um erro ao processar sua requisição.');
        return;
      }

      toast.success('Cliente inativado com sucesso.');
      setOpen(false);
      document.dispatchEvent(new Event('clients:updated'));
    } catch (error) {
      console.error(error);
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" title="Inativar Cliente">
          <UserMinusIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        {loading && (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Inativar cliente</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </>
        )}

        {!loading && pipelineStatus && !pipelineStatus.canInactivate && (
          <>
            <DialogHeader>
              <DialogTitle>Não é possível inativar</DialogTitle>
            </DialogHeader>

            <div className="mt-4 mb-4 space-y-3">
              <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <AlertTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  O cliente <strong>{client.name}</strong> não pode ser inativado porque sua
                  negociação ainda não foi encerrada.
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Status atual:</span>{' '}
                {pipelineStatus.stepLabel} — {pipelineStatus.statusLabel}
              </div>

              <p className="text-sm text-muted-foreground">
                Para inativar, primeiro mova o cliente para{' '}
                <strong>Fechado – Ganho</strong> ou <strong>Fechado – Perdido</strong> no
                pipeline.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Entendi
              </Button>
            </DialogFooter>
          </>
        )}

        {!loading && pipelineStatus && pipelineStatus.canInactivate && (
          <form action={handleAction}>
            <DialogHeader>
              <DialogTitle>Inativar cliente</DialogTitle>
            </DialogHeader>

            <div className="mt-4 mb-4 space-y-3">
              <p className="text-sm">
                Deseja realmente inativar <strong>{client.name}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                O cliente será marcado como inativo, mas não será excluído do sistema. Para que
                ele volte a ser um lead ativo, será necessário reativá-lo.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <SubmitButton variant="destructive">Sim, inativar</SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const DeleteClientButton = InactivateClientButton;
