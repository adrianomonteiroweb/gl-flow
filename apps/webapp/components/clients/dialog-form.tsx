'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertCircle, CloudOff, Loader2, Plus, UserCheck, WifiOff } from 'lucide-react';

import { onlyNumbers, isCpf, isCnpj } from '@workspace/utils/text';
import { createClient, lookupClientByDocument, lookupCompanyByCnpj } from '@/actions/clients';
import { useOfflineSyncContext, type ClientPayload } from '@/contexts/offline-sync';
import type { BrasilApiCompany } from '@/lib/brasilapi';
import { MARITAL_STATUS_OPTIONS } from '@/lib/clients/marital-status';
import { DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';

import { AddressFields } from './address-fields';
import { PartnerFields } from './partner-fields';
import {
  clientFormSchema,
  DEFAULT_CLIENT_FORM,
  EMPTY_ADDRESS,
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

const sliceDate = (value: unknown): string => (value ? String(value).slice(0, 10) : '');

export const ClientDialogForm = ({ onSubmit = () => {} }: { onSubmit?: (result?: ClientDialogResult) => void }) => {
  const { is_online, addClientToQueue } = useOfflineSyncContext();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: DEFAULT_CLIENT_FORM,
    mode: 'onSubmit',
  });

  const partners = useFieldArray({ control: form.control, name: 'partners' });

  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('idle');
  const [existingClient, setExistingClient] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const last_fetched_doc_ref = useRef<string>('');
  const api_enrichment_ref = useRef<Record<string, unknown> | null>(null);
  const is_online_ref = useRef(is_online);

  useEffect(() => {
    is_online_ref.current = is_online;
  }, [is_online]);

  const personType = form.watch('personType');
  const documentValue = form.watch('document');

  const fields_disabled = documentStatus === 'idle' || documentStatus === 'loading';
  const fields_read_only = documentStatus === 'found';
  const all_disabled = fields_disabled || fields_read_only;

  const resetFormState = (): void => {
    form.reset(DEFAULT_CLIENT_FORM);
    setDocumentStatus('idle');
    setExistingClient(null);
    last_fetched_doc_ref.current = '';
    api_enrichment_ref.current = null;
  };

  /**
   * Switches person type clearing every field first. On auto-detection
   * (keep_document) the pasted document is preserved so the lookup can proceed;
   * on a manual switch the document is cleared along with the rest.
   */
  const switchPersonType = (next: 'pf' | 'pj', keep_document: boolean): void => {
    const document = keep_document ? form.getValues('document') : '';

    form.reset({ ...DEFAULT_CLIENT_FORM, personType: next, document });
    setExistingClient(null);
    api_enrichment_ref.current = null;
    last_fetched_doc_ref.current = '';
    setDocumentStatus(keep_document ? 'loading' : 'idle');
  };

  const populateFromClient = (client: Record<string, unknown>): void => {
    const addr = (client.address as Record<string, string>) ?? {};
    const payload = (client.payload as Record<string, any>) ?? {};
    const seededPartners = Array.isArray(client.partners) ? (client.partners as Record<string, any>[]) : [];

    form.reset({
      personType: (client.person_type as 'pf' | 'pj') ?? 'pf',
      document: formatDocument(String(client.document ?? '')),
      name: String(client.name ?? ''),
      tradeName: String(client.trade_name ?? ''),
      email: String(client.email ?? ''),
      phone: String(client.phone ?? ''),
      phoneSecondary: String(client.phone_secondary ?? ''),
      birthDate: sliceDate(client.birth_date),
      foundingDate: sliceDate(client.founding_date),
      maritalStatus: String(client.marital_status ?? ''),
      municipalRegistration: String(payload.inscricoes?.municipal ?? ''),
      stateRegistration: String(payload.inscricoes?.estadual ?? ''),
      address: { ...EMPTY_ADDRESS, ...addr },
      partners: seededPartners.map(partner => ({
        ...emptyPartner(),
        ...partner,
        document: formatDocument(String(partner.document ?? '')),
        address: { ...EMPTY_ADDRESS, ...(partner.address ?? {}) },
      })),
    });
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

  const buildPayload = (values: ClientFormValues): Record<string, unknown> => {
    const extras: Record<string, unknown> = {};

    if (api_enrichment_ref.current) {
      extras.cnpj = api_enrichment_ref.current;
    }

    const municipal = values.municipalRegistration?.trim();
    const estadual = values.stateRegistration?.trim();

    if (municipal || estadual) {
      extras.inscricoes = {
        ...(municipal ? { municipal } : {}),
        ...(estadual ? { estadual } : {}),
      };
    }

    const base: Record<string, unknown> = {
      person_type: values.personType,
      name: values.name,
      document: onlyNumbers(values.document),
      email: values.email,
      phone: values.phone,
      phone_secondary: values.phoneSecondary || undefined,
      address: { ...values.address, zipCode: onlyNumbers(values.address.zipCode) },
      client_created_at: new Date().toISOString(),
    };

    if (Object.keys(extras).length > 0) {
      base.payload = extras;
    }

    if (values.personType === 'pf') {
      return { ...base, birth_date: values.birthDate, marital_status: values.maritalStatus };
    }

    return {
      ...base,
      trade_name: values.tradeName || undefined,
      founding_date: values.foundingDate,
      partners: values.partners.map(partner => ({
        ...partner,
        document: onlyNumbers(partner.document),
        address: { ...partner.address, zipCode: onlyNumbers(partner.address.zipCode) },
      })),
    };
  };

  const handleValid = async (values: ClientFormValues): Promise<void> => {
    if (documentStatus === 'found' && existingClient) {
      onSubmit({ id: String(existingClient.id), name: String(existingClient.name), isExisting: true });
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
  const partnersError = (form.formState.errors.partners as { message?: string } | undefined)?.message;

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

        {documentStatus === 'found' && (
          <Alert className="mt-4 border-blue-200 bg-blue-50 text-blue-800">
            <UserCheck className="h-4 w-4" />
            <AlertDescription>Cliente já cadastrado.</AlertDescription>
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
                  disabled={fields_read_only}
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
                      disabled={fields_read_only}
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

        <fieldset disabled={all_disabled} className="mt-4 space-y-4 border-0 p-0 disabled:opacity-70">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{personType === 'pj' ? 'Razão Social' : 'Nome Completo'} *</FormLabel>
                <FormControl>
                  <Input {...field} value={(field.value as string) ?? ''} placeholder="Ex: João da Silva" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {personType === 'pj' && (
            <FormField
              control={form.control}
              name="tradeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Fantasia</FormLabel>
                  <FormControl>
                    <Input {...field} value={(field.value as string) ?? ''} placeholder="Ex: Loja Central" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className={`grid grid-cols-2 gap-4 ${personType === 'pj' ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
            <FormField
              control={form.control}
              name="phoneSecondary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp {personType === 'pf' ? '*' : ''}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={(field.value as string) ?? ''}
                      onChange={e => field.onChange(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      aria-describedby={personType === 'pf' ? 'contact-requirement' : undefined}
                    />
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
                  <FormLabel>Telefone {personType === 'pf' ? '*' : ''}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={(field.value as string) ?? ''}
                      onChange={e => field.onChange(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      aria-describedby={personType === 'pf' ? 'contact-requirement' : undefined}
                    />
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
                    <Input {...field} type="email" value={(field.value as string) ?? ''} placeholder="nome@email.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {personType === 'pf' && (
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nascimento *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" value={(field.value as string) ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {personType === 'pf' && (
            <div
              id="contact-requirement"
              className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
              role="alert"
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>Informe <strong>WhatsApp</strong> ou <strong>Telefone</strong> — pelo menos um é obrigatório.</span>
            </div>
          )}

          {personType === 'pf' && (
            <FormField
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <FormItem className="sm:max-w-xs">
                  <FormLabel>Estado civil *</FormLabel>
                  <Select value={(field.value as string) ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MARITAL_STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {personType === 'pj' && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="foundingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de abertura *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" value={(field.value as string) ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Endereço</h4>
            <AddressFields pathPrefix="address" disabled={all_disabled} online={is_online} />
          </div>

          {personType === 'pj' && (
            <>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">Inscrições</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="municipalRegistration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição municipal</FormLabel>
                        <FormControl>
                          <Input {...field} value={(field.value as string) ?? ''} placeholder="Opcional" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stateRegistration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição estadual</FormLabel>
                        <FormControl>
                          <Input {...field} value={(field.value as string) ?? ''} placeholder="Opcional" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Sócios *</h4>
                  <Button type="button" variant="outline" size="sm" onClick={() => partners.append(emptyPartner())}>
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar sócio
                  </Button>
                </div>

                {partnersError && <p className="mb-2 text-sm text-destructive">{partnersError}</p>}

                <div className="space-y-4">
                  {partners.fields.map((item, index) => (
                    <PartnerFields key={item.id} index={index} online={is_online} onRemove={() => partners.remove(index)} />
                  ))}
                </div>
              </div>
            </>
          )}
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
            ) : (
              'Salvar'
            )}
          </SubmitButton>
        </DialogFooter>
      </form>
    </Form>
  );
};
