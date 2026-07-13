'use client';

import { useState } from 'react';

import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent, DialogTrigger } from '@workspace/ui/components/dialog';

import { ClientDialogForm, type ClientDialogResult } from './dialog-form';

export const CreateClientButton = ({ onClientCreated }: { onClientCreated?: (result: ClientDialogResult) => void }) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleSubmit = (result?: ClientDialogResult): void => {
    setOpen(false);

    if (result && onClientCreated) {
      onClientCreated(result);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Novo Cliente</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
        <ClientDialogForm onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
};
