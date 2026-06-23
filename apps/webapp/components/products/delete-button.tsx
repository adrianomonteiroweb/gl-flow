'use client';

import { useState } from 'react';
import { deleteProduct } from '@/actions/products';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { TrashIcon } from 'lucide-react';

export const DeleteProductButton = ({ product }: any) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await deleteProduct(product.id);

      if (!result.success) {
        toast.error(result.error ?? 'Erro ao remover produto.');
        setIsSubmitting(false);
        return;
      }

      toast.success('Produto removido com sucesso.');
      document.dispatchEvent(new Event('products:updated'));
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
        <Button type="button" variant="outline" title="Remover Produto">
          <TrashIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Remover produto</DialogTitle>
        </DialogHeader>

        <div className="mt-5 mb-5">Deseja realmente remover <strong>{product.name}</strong>?</div>

        <DialogFooter>
          <Button variant="destructive" disabled={isSubmitting} onClick={handleDelete}>
            {isSubmitting ? 'Aguarde...' : 'Sim, remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
