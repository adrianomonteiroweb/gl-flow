'use client';

import { useState } from 'react';

import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent, DialogTrigger } from '@workspace/ui/components/dialog';

import { ClientDialogForm } from './dialog-form';

export function CreateClientButton() {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Novo Cliente</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <ClientDialogForm onSubmit={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
