'use client';

import { useState } from 'react';
import { SquarePen } from 'lucide-react';

import { Dialog, DialogContent, DialogTrigger } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';

import { ClientEditForm } from './client-edit-form';

export function EditClientButton({ client }: any) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" title="Editar cliente" aria-label="Editar cliente">
          <SquarePen className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <ClientEditForm client={client} onSaved={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
