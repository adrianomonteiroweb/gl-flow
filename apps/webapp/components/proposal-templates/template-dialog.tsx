'use client';

import { useState } from 'react';

import { Dialog, DialogContent, DialogTrigger } from '@workspace/ui/components/dialog';

import { TemplateForm } from './template-form';

type TemplateFormMode = 'create' | 'edit' | 'view';

interface TemplateDialogProps {
  mode: TemplateFormMode;
  template?: any;
  trigger: React.ReactNode;
}

export const TemplateDialog = ({ mode, template, trigger }: TemplateDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-[900px]"
        aria-describedby={undefined}
        onPointerDownOutside={event => {
          const target = event.detail.originalEvent.target as HTMLElement | null;

          if (target?.closest('[data-variable-suggestion]')) {
            event.preventDefault();
          }
        }}>
        <TemplateForm mode={mode} template={template} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
