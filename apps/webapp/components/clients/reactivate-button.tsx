'use client';

import { reactivateClient } from '@/actions/clients';
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
import { UserCheckIcon } from 'lucide-react';
import SubmitButton from '@workspace/ui/components/submit-button';
import { useState } from 'react';

export const ReactivateClientButton = ({ client }: any) => {
  const [open, setOpen] = useState(false);

  const handleAction = async () => {
    try {
      const result = await reactivateClient(client.id);

      if (result?.status !== 200) {
        toast.error(result?.message ?? 'Ops! Ocorreu um erro ao processar sua requisição.');
        return;
      }

      toast.success('Cliente reativado com sucesso.');
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
        <Button type="button" variant="outline" title="Reativar Cliente">
          <UserCheckIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <form action={handleAction}>
          <DialogHeader>
            <DialogTitle>Reativar cliente</DialogTitle>
          </DialogHeader>

          <div className="mt-4 mb-4 space-y-3">
            <p className="text-sm">
              Deseja realmente reativar <strong>{client.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              O cliente voltará a ficar ativo e poderá gerar novos leads no pipeline.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton>Sim, reativar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
