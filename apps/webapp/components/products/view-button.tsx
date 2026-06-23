'use client';

import { EyeIcon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { ProductDialog } from './product-dialog';

export const ViewProductButton = ({ product }: any) => (
  <ProductDialog
    mode="view"
    product={product}
    trigger={
      <Button variant="outline" title="Visualizar Produto">
        <EyeIcon className="h-4 w-4" />
      </Button>
    }
  />
);
