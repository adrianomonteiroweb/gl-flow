'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertCircle, CloudOff, Loader2, Pencil, UserCheck, WifiOff } from 'lucide-react';

import { onlyNumbers, isCpf, isCnpj } from '@workspace/utils/text';
import { createClient, updateClient, lookupClientByDocument, lookupCompanyByCnpj } from '@/actions/clients';
import { useOfflineSyncContext, type ClientPayload } from '@/contexts/offline-sync';
import type { BrasilApiCompany } from '@/lib/brasilapi';
import { DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';

import { ClientFormBody } from './client-form-body';
import {
  buildClientPayload,
  clientFormSchema,
  clientToFormValues,
  DEFAULT_CLIENT_FORM,
  emptyPartner,
  formatDocument,
  formatPhone,
  formatZip,
  type ClientFormValues,
} from './client-form-schema';

type DocumentStatus = 'idle' | 'loading' | 'found' | 'enriched' | 'not-found' | 'error';

export type ClientDialogResult = {
  id: string;
  name: string;
  isExisting: boolean;
};

export const ClientDialogForm = ({ onSubmit = () => {} }: { onSubmit?: (result?: ClientDialogResult) => void }) => {
  const { is_online, addClientToQueue } = useOfflineSyncContext();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: DEFAULT_CLIENT_FORM,
    mode: 'onSubmit',
  });

  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('idle');
  const [existingClient, setExistingClient] = useState<Record<string, unknown> | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const last_fetched_doc_ref = useRef<string>('');
  const api_enrichment_ref = useRef<Record<string, unknown> | null>(null);
  const is_online_ref = useRef(is_online);

  useEffect(() => {
    is_online_ref.current = is_online;
  }, [is_online]);

  const personType = form.watch('personType');
  const documentValue = form.watch('document');

  const is_existing = documentStatus === 'found';
  const fields_disabled = documentStatus === 'idle' || documentStatus === 'loading';
  // Document and person type identify the client — kept locked once a client is found.
  const identity_locked = is_existing;
  // Existing clients are read-only until the user opts into editing; address lookup
  // is suppressed for them so a known CEP is never re-fetched.
  const all_disabled = fields_disabled || (is_existing && !isEditingExisting);
  const address_auto_fetch = !is_existing;

  /**
   * Switches person type clearing every field first. On auto-detection
   * (keep_document) the pasted document is preserved so the lookup can proceed;
   * on a manual switch the document is cleared along with the rest.
   */
  const switchPersonType = (next: 'pf' | 'pj', keep_document: boolean): void => {
    const document = keep_document ? form.getValues('document') : '';

    form.reset({ ...DEFAULT_CLIENT_FORM, personType: next, document });
    setExistingClient(null);
    setIsEditingExisting(false);
    api_enrichment_ref.current = null;
    last_fetched_doc_ref.current = '';
    setDocumentStatus(keep_document ? 'loading' : 'idle');
  };

  const populateFromClient = (client: Record<string, unknown>): void => {
    const payload = (client.payload as Record<string, any>) ?? {};

    // Preserve API enrichment so editing the client does not drop payload.cnpj.
    api_enrichment_ref.current = (payload.cnpj as Record<string, unknown>) ?? null;

    form.reset(clientToFormValues(client));
  };

  const applyCompany = (company: BrasilApiCompany): void => {
    const setIfEmpty = (name: FieldPath<ClientFormValues>, value: string): void => {
      if (value && !form.getValues(name)) {
        form.setValue(name, value);
      }
    };

    const cidadeParts = (company.cidadeUf ?? '').split('/');

    form.setValue('personType', 'pj');
    setIfEmpty('name', company.razaoSocial);
    setIfEmpty('tradeName', company.nomeFantasia);
    setIfEmpty('phone', company.telefone ? formatPhone(company.telefone) : '');
    setIfEmpty('email', company.email);
    setIfEmpty('foundingDate', company.aberturaDate);
    setIfEmpty('address.street', company.endereco);
    setIfEmpty('address.neighborhood', company.bairro);
    setIfEmpty('address.city', cidadeParts[0]?.trim() ?? '');
    setIfEmpty('address.state', cidadeParts[1]?.trim() ?? '');
    setIfEmpty('address.zipCode', company.cep ? formatZip(onlyNumbers(company.cep)) : '');

    if (form.getValues('partners').length === 0 && company.partners.length > 0) {
      form.setValue(
        'partners',
        company.partners.map(partner => emptyPartner(partner.name))
      );
    }

    api_enrichment_ref.current = company.enrichment as unknown as Record<string, unknown>;
  };

  // ─── Document lookup ──────────────────────────────────────────────────────

  useEffect(() => {
    const digits = onlyNumbers(documentValue);

    if (digits.length < 11) {
      if (last_fetched_doc_ref.current) {
        setDocumentStatus('idle');
        setExistingClient(null);
        setIsEditingExisting(false);
        last_fetched_doc_ref.current = '';
      }

      return;
    }

    // Auto-detect document type: switch and let the effect re-run with the
    // correct type — the re-run performs the lookup so it is never cancelled by
    // the personType change triggered here.
    const is_cpf_format = digits.length === 11 && isCpf(digits);
    const is_cnpj_format = digits.length === 14 && isCnpj(digits);

    if (is_cnpj_format && personType === 'pf') {
      switchPersonType('pj', true);
      toast.info('Tipo alterado para Pessoa Jurídica.');
      return;
    }

    if (is_cpf_format && personType === 'pj') {
      switchPersonType('pf', true);
      toast.info('Tipo alterado para Pessoa Física.');
      return;
    }

    const is_cpf_valid = personType === 'pf' && digits.length === 11 && isCpf(digits);
    const is_cnpj_valid = personType === 'pj' && digits.length === 14 && isCnpj(digits);

    if (!is_cpf_valid && !is_cnpj_valid) {
      return;
    }

    if (digits === last_fetched_doc_ref.current) {
      return;
    }

    if (!is_online_ref.current) {
      last_fetched_doc_ref.current = digits;
      setDocumentStatus('not-found');
      setExistingClient(null);
      return;
    }

    last_fetched_doc_ref.current = digits;
    let cancelled = false;

    const run = async (): Promise<void> => {
      setDocumentStatus('loading');
      setExistingClient(null);

      try {
        if (is_cpf_valid) {
          const result = await lookupClientByDocument(digits);

          if (cancelled) {
            return;
          }

          if (result.status === 200 && result.data) {
            populateFromClient(result.data as Record<string, unknown>);
            setExistingClient(result.data as Record<string, unknown>);
            setDocumentStatus('found');
            toast.info('Cliente encontrado na base.');
            return;
          }

          setDocumentStatus('not-found');
          return;
        }

        if (is_cnpj_valid) {
          const result = await lookupCompanyByCnpj(digits);

          if (cancelled) {
            return;
          }

          if (result.existingClient) {
            populateFromClient(result.existingClient as Record<string, unknown>);
            setExistingClient(result.existingClient as Record<string, unknown>);
            setDocumentStatus('found');
            toast.info('Empresa encontrada na base.');
            return;
          }

          if (result.company) {
            applyCompany(result.company);
            toast.success('Dados da empresa preenchidos.');
            setDocumentStatus('enriched');
            return;
          }

          setDocumentStatus('not-found');
          return;
        }
      } catch {
        if (!cancelled) {
          setDocumentStatus('error');
          toast.error('Erro ao buscar dados. Preencha manualmente.');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [documentValue, personType]);

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const buildPayload = (values: ClientFormValues): Record<string, unknown> => ({
    ...buildClientPayload(values, { enrichment: api_enrichment_ref.current }),
    client_created_at: new Date().toISOString(),
  });

  const handleValid = async (values: ClientFormValues): Promise<void> => {
    // Existing client, not editing: just select it as-is.
    if (is_existing && existingClient && !isEditingExisting) {
      onSubmit({ id: String(existingClient.id), name: String(existingClient.name), isExisting: true });
      return;
    }

    // Existing client, editing: persist the changed fields.
    if (is_existing && existingClient) {
      setIsSubmitting(true);

      try {
        const id = String(existingClient.id);
        const result = await updateClient(id, buildPayload(values));

        if (result?.status !== 200) {
          toast.error(result?.message ?? 'Ocorreu um erro ao atualizar o cliente.');
          return;
        }

        toast.success('Cliente atualizado com sucesso.');
        document.dispatchEvent(new Event('clients:updated'));
        onSubmit({ id, name: values.name, isExisting: true });
      } catch {
        toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setIsSubmitting(true);

    try {
      const payload = buildPayload(values);

      if (!is_online) {
        const offline_id = crypto.randomUUID();
        addClientToQueue(offline_id, payload as ClientPayload);
        toast.success('Cliente salvo localmente. Será sincronizado ao reconectar.');
        document.dispatchEvent(new Event('clients:updated'));
        onSubmit({ id: offline_id, name: values.name, isExisting: false });
        return;
      }

      const result = await createClient(payload);

      if (result?.status !== 200) {
        toast.error(result?.message ?? 'Ocorreu um erro ao criar o cliente.');
        return;
      }

      toast.success('Cliente criado com sucesso.');
      document.dispatchEvent(new Event('clients:updated'));

      const created = result.data as Record<string, unknown> | undefined;

      onSubmit(created ? { id: String(created.id), name: String(created.name), isExisting: false } : undefined);
    } catch {
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvalid = (): void => {
    toast.error('Preencha os campos obrigatórios destacados.');
  };

  const digits = onlyNumbers(documentValue);
  const documentLabel = digits.length < 11 ? 'CPF ou CNPJ' : personType === 'pj' ? 'CNPJ' : 'CPF';
  const documentPlaceholder = personType === 'pj' ? '00.000.000/0000-00' : '000.000.000-00';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid, handleInvalid)}>
        <DialogHeader>
          <DialogTitle>Identificação do Cliente</DialogTitle>
        </DialogHeader>

        {!is_online && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            <WifiOff size={13} className="shrink-0" aria-hidden="true" />
            <span>Sem conexão — dados serão salvos localmente e sincronizados ao reconectar</span>
          </div>
        )}

        {is_existing && (
          <Alert className="mt-4 border-blue-200 bg-blue-50 text-blue-800">
            <UserCheck className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>
                {isEditingExisting
                  ? 'Editando um cliente já cadastrado. Altere os campos desejados e salve.'
                  : 'Cliente já cadastrado.'}
              </span>
              {!isEditingExisting && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setIsEditingExisting(true)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar dados
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {documentStatus === 'enriched' && (
          <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-800">
            <UserCheck className="h-4 w-4" />
            <AlertDescription>Dados preenchidos automaticamente. Revise e complete os campos.</AlertDescription>
          </Alert>
        )}

        {documentStatus === 'not-found' && digits.length >= 11 && (
          <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Nenhum dado encontrado. Preencha os campos manualmente.</AlertDescription>
          </Alert>
        )}

        {documentStatus === 'error' && (
          <Alert className="mt-4 border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Erro ao buscar dados. Preencha os campos manualmente.</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 space-y-4">
          <FormField
            control={form.control}
            name="personType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de documento *</FormLabel>
                <Select
                  value={(field.value as string) ?? 'pf'}
                  onValueChange={value => switchPersonType(value as 'pf' | 'pj', false)}
                  disabled={identity_locked}
                >
                  <FormControl>
                    <SelectTrigger className="w-full sm:max-w-xs">
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
                <FormLabel>{documentLabel} *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      value={(field.value as string) ?? ''}
                      onChange={e => field.onChange(formatDocument(e.target.value))}
                      placeholder={documentPlaceholder}
                      inputMode="numeric"
                      autoFocus
                      disabled={identity_locked}
                    />
                    {documentStatus === 'loading' && (
                      <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <fieldset disabled={all_disabled} className="mt-4 border-0 p-0 disabled:opacity-70">
          <ClientFormBody online={is_online} addressAutoFetch={address_auto_fetch} />
        </fieldset>

        <DialogFooter className="mt-6 flex flex-row justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => onSubmit()}>
            Cancelar
          </Button>
          <div className="flex-1" />
          <SubmitButton isSubmitting={isSubmitting}>
            {!is_online ? (
              <>
                <CloudOff size={14} className="mr-1.5" aria-hidden="true" />
                Salvar localmente
              </>
            ) : is_existing && isEditingExisting ? (
              'Salvar alterações'
            ) : is_existing ? (
              'Selecionar cliente'
            ) : (
              'Salvar'
            )}
          </SubmitButton>
        </DialogFooter>
      </form>
    </Form>
  );
};
