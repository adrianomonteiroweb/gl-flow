'use client';

import { Button } from '@workspace/ui/components/button';
import { TemplateDialog } from './template-dialog';

export const CreateTemplateButton = () => (
  <TemplateDialog mode="create" trigger={<Button variant="outline">Novo Modelo</Button>} />
);
