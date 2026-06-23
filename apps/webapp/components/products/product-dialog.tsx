'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@workspace/ui/components/dialog';
import { ProductForm } from './product-form';

type ProductFormMode = 'create' | 'edit' | 'view';

interface ProductDialogProps {
  mode: ProductFormMode;
  product?: any;
  trigger: React.ReactNode;
}

export const ProductDialog = ({ mode, product, trigger }: ProductDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <ProductForm mode={mode} product={product} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
