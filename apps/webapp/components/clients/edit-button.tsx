'use client';

import { useRef, useState } from 'react';
import { SquarePen } from 'lucide-react';

import { Dialog, DialogContent, DialogTrigger } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';

import { ClientEditForm } from './client-edit-form';
import type { ClientFormValues } from './client-form-schema';

export function EditClientButton({ client }: any) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [capturedValues, setCapturedValues] = useState<ClientFormValues | null>(null);
  const getValuesRef = useRef<(() => ClientFormValues) | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && getValuesRef.current) {
      setCapturedValues(getValuesRef.current());
    }

    setOpen(isOpen);
  };

  const handleSaved = () => {
    setCapturedValues(null);
    setOpen(false);
    setFormKey(k => k + 1);
  };

  const handleCancel = () => {
    setCapturedValues(null);
    setOpen(false);
    setFormKey(k => k + 1);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" title="Editar cliente" aria-label="Editar cliente">
          <SquarePen className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <ClientEditForm
          key={formKey}
          client={client}
          initialValues={capturedValues}
          onReady={fn => { getValuesRef.current = fn; }}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
