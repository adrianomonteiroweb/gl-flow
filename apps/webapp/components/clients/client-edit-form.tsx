'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

import { cpfOrCnpj } from '@workspace/utils/text';
import { updateClient } from '@/actions/clients';
import { DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { Form } from '@workspace/ui/components/form';
import { getToneClasses } from '@/lib/tone-colors';

import { ClientFormBody } from './client-form-body';
import { buildClientPayload, clientFormSchema, clientToFormValues, type ClientFormValues } from './client-form-schema';

type ClientEditFormProps = {
  client: Record<string, any>;
  onSaved?: (client: Record<string, any>) => void;
  onCancel?: () => void;
};

export const ClientEditForm = ({ client, onSaved, onCancel }: ClientEditFormProps) => {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: clientToFormValues(client),
    mode: 'onSubmit',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCompany = client?.person_type === 'pj';
  const documentLabel = isCompany ? 'CNPJ' : 'CPF';
  const documentValue = client?.document ? cpfOrCnpj(String(client.document)) : '—';

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
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid, handleInvalid)}>
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>

        {/* Identity is immutable — shown for context, kept out of the editable body. */}
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
