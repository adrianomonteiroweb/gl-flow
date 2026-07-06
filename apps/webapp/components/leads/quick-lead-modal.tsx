'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CloudOff, WifiOff } from 'lucide-react';

import { onlyNumbers } from '@workspace/utils/text';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';

import { createQuickLead } from '@/actions/clients';
import { useSessionContext } from '@/contexts/session';
import { useOfflineSyncContext } from '@/contexts/offline-sync';
import { formatPhone } from '@/components/clients/client-form-schema';

const QuickLeadSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().refine(value => onlyNumbers(value).length >= 10, 'WhatsApp/Telefone inválido'),
});

type QuickLeadValues = z.infer<typeof QuickLeadSchema>;

const DEFAULT_VALUES: QuickLeadValues = { name: '', email: '', phone: '' };

export const QuickLeadModal = () => {
  const pathname = usePathname();
  const { user, loading } = useSessionContext();
  const { is_online, addQuickLeadToQueue } = useOfflineSyncContext();
  const [open, setOpen] = useState(false);
  const opened_ref = useRef(false);

  const form = useForm<QuickLeadValues>({
    resolver: zodResolver(QuickLeadSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (!loading && user && !opened_ref.current && pathname.startsWith('/pipelines')) {
      opened_ref.current = true;
      setOpen(true);
    }
  }, [loading, user, pathname]);

  useEffect(() => {
    const handleOpen = () => {
      form.reset(DEFAULT_VALUES);
      setOpen(true);
    };

    document.addEventListener('quick-lead:open', handleOpen);

    return () => {
      document.removeEventListener('quick-lead:open', handleOpen);
    };
  }, [form]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);

    if (!next) {
      form.reset(DEFAULT_VALUES);
    }
  };

  // Clears the form and refocuses the first field so the user can register the
  // next lead in sequence without reopening the modal.
  const readyForNext = () => {
    form.reset(DEFAULT_VALUES);
    form.setFocus('name');
  };

  const onSubmit = async (values: QuickLeadValues) => {
    if (!is_online) {
      const offline_id = crypto.randomUUID();
      addQuickLeadToQueue(offline_id, values);
      toast.success('Lead salvo localmente. Será sincronizado ao reconectar.');
      document.dispatchEvent(new Event('leads:updated'));
      document.dispatchEvent(new Event('clients:updated'));
      readyForNext();
      return;
    }

    const result = await createQuickLead(values);

    if (!result.success) {
      toast.error(result.message ?? 'Erro ao cadastrar lead.');
      return;
    }

    toast.success('Lead cadastrado.');
    document.dispatchEvent(new Event('leads:updated'));
    document.dispatchEvent(new Event('clients:updated'));
    readyForNext();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Lead</DialogTitle>
        </DialogHeader>

        {!is_online && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            <WifiOff size={13} className="shrink-0" aria-hidden="true" />
            <span>Sem conexão — o lead será salvo localmente e sincronizado ao reconectar</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: João da Silva" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="nome@email.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp / Telefone *</FormLabel>
                  <FormControl>
                    <Input {...field} onChange={e => field.onChange(formatPhone(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <SubmitButton isSubmitting={form.formState.isSubmitting}>
                {!is_online ? (
                  <>
                    <CloudOff size={14} className="mr-1.5" aria-hidden="true" />
                    Salvar localmente
                  </>
                ) : (
                  'Cadastrar'
                )}
              </SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
