'use client';

import { Dialog, DialogContent, DialogTrigger } from '@workspace/ui/components/dialog';

import { UserDialogForm } from './dialog-form';
import { Button } from '@workspace/ui/components/button';
import { PencilIcon } from 'lucide-react';

import { useState } from 'react';

export function EditUserButton({ user }: any) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" title="Editar Usuário">
          <PencilIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <UserDialogForm user={user} onSubmit={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
