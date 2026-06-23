'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteProposalTemplate } from '@/actions/proposal-templates';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { TrashIcon } from 'lucide-react';

export const DeleteTemplateButton = ({ template }: any) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await deleteProposalTemplate(template.id);

      if (!result.success) {
        toast.error(result.error ?? 'Erro ao remover modelo.');
        setIsSubmitting(false);
        return;
      }

      toast.success('Modelo removido com sucesso.');
      document.dispatchEvent(new Event('proposal-templates:updated'));
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" title="Remover Modelo">
          <TrashIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Remover modelo</DialogTitle>
        </DialogHeader>

        <div className="mb-5 mt-5">
          Deseja realmente remover <strong>{template.name}</strong>?
        </div>

        <DialogFooter>
          <Button variant="destructive" disabled={isSubmitting} onClick={handleDelete}>
            {isSubmitting ? 'Aguarde...' : 'Sim, remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
