'use client';

import { Button } from '@workspace/ui/components/button';
import { ProductDialog } from './product-dialog';

export const CreateProductButton = () => (
  <ProductDialog
    mode="create"
    trigger={<Button variant="outline">Novo Produto</Button>}
  />
);
