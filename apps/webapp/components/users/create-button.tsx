'use client';

import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent, DialogTrigger } from '@workspace/ui/components/dialog';
import { useState } from 'react';
import { UserDialogForm } from './dialog-form';

export function CreateUserButton() {
  const [open, setOpen]: any = useState();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Novo Usuário</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <UserDialogForm onSubmit={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
