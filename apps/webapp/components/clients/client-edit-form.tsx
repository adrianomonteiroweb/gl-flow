'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

import { cpfOrCnpj } from '@workspace/utils/text';
import { updateClient } from '@/actions/clients';
import { DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Input } from '@workspace/ui/components/input';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { getToneClasses } from '@/lib/tone-colors';

import { ClientFormBody } from './client-form-body';
import { buildClientPayload, clientFormSchema, clientToFormValues, formatDocument, type ClientFormValues } from './client-form-schema';

type ClientEditFormProps = {
  client: Record<string, any>;
  initialValues?: ClientFormValues | null;
  onReady?: (getValues: () => ClientFormValues) => void;
  onSaved?: (client: Record<string, any>) => void;
  onCancel?: () => void;
};

export const ClientEditForm = ({ client, initialValues, onReady, onSaved, onCancel }: ClientEditFormProps) => {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: initialValues ?? clientToFormValues(client),
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (!onReady) {
      return;
    }

    onReady(() => form.getValues());
    // onReady and form are stable references — no re-registration needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasDocument = !!client?.document;
  const isCompany = client?.person_type === 'pj';
  const documentLabel = isCompany ? 'CNPJ' : 'CPF';
  const documentValue = client?.document ? cpfOrCnpj(String(client.document)) : '—';

  const selectedPersonType = form.watch('personType');
  const editableDocumentLabel = selectedPersonType === 'pj' ? 'CNPJ' : 'CPF';
  const editableDocumentPlaceholder = selectedPersonType === 'pj' ? '00.000.000/0000-00' : '000.000.000-00';

  const handleValid = async (values: ClientFormValues): Promise<void> => {
    setIsSubmitting(true);

    try {
      const enrichment = (client?.payload?.cnpj as Record<string, unknown>) ?? null;
      const result = await updateClient(String(client.id), buildClientPayload(values, { enrichment }));

      if (result?.status !== 200) {
        toast.error(result?.message ?? 'Ocorreu um erro ao atualizar o cliente.');
        return;
      }

      toast.success('Cliente atualizado com sucesso.');
      document.dispatchEvent(new Event('clients:updated'));
      onSaved?.({ ...client, ...values });
    } catch {
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvalid = (): void => {
    toast.error('Preencha os campos obrigatórios destacados.');
    setTimeout(() => {
      const errorEl = document.querySelector('[aria-invalid="true"]');
      errorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid, handleInvalid)}>
        <DialogHeader>
          <DialogTitle>{hasDocument ? 'Editar cliente' : 'Completar cadastro'}</DialogTitle>
        </DialogHeader>

        {hasDocument ? (
          /* Identity is immutable once set — shown for context, kept out of the editable body. */
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-muted/40 px-3 py-2.5">
            <Badge variant="secondary" className={getToneClasses('info').soft}>
              {isCompany ? 'Pessoa Jurídica' : 'Pessoa Física'}
            </Badge>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-muted-foreground">{documentLabel}</span>
              <span className="text-sm font-medium text-foreground">{documentValue}</span>
            </div>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Lock size={12} aria-hidden="true" />
              Documento e tipo não podem ser alterados
            </span>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="personType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de documento</FormLabel>
                  <Select value={(field.value as string) ?? 'pf'} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pf">Pessoa Física (CPF)</SelectItem>
                      <SelectItem value="pj">Pessoa Jurídica (CNPJ)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{editableDocumentLabel}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={(field.value as string) ?? ''}
                      onChange={e => field.onChange(formatDocument(e.target.value))}
                      placeholder={editableDocumentPlaceholder}
                      inputMode="numeric"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="mt-4">
          <ClientFormBody online addressAutoFetch={false} />
        </div>

        <DialogFooter className="mt-6 flex flex-row justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => onCancel?.()}>
            Cancelar
          </Button>
          <div className="flex-1" />
          <SubmitButton isSubmitting={isSubmitting}>Salvar alterações</SubmitButton>
        </DialogFooter>
      </form>
    </Form>
  );
};
