'use client';

import { PencilIcon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { ProductDialog } from './product-dialog';

export const EditProductButton = ({ product }: any) => (
  <ProductDialog
    mode="edit"
    product={product}
    trigger={
      <Button variant="outline" title="Editar Produto">
        <PencilIcon className="h-4 w-4" />
      </Button>
    }
  />
);
