'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CloudOff, Loader2, UserCheck, WifiOff } from 'lucide-react';

import { onlyNumbers, isCpf, isCnpj, formatPhoneBR } from '@workspace/utils/text';
import { createClient, lookupClientByDocument, lookupCompanyByCnpj } from '@/actions/clients';
import { lookupAddressByZip } from '@/actions/cep';
import { useOfflineSyncContext } from '@/contexts/offline-sync';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@workspace/ui/components/dialog';
import { Label } from '@workspace/ui/components/label';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { SubmitButton } from '@workspace/ui/components/submit-button';

type DocumentStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error';

type AddressState = {
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type FormState = {
  personType: 'pf' | 'pj';
  document: string;
  name: string;
  tradeName: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  birthDate: string;
  address: AddressState;
};

const INITIAL_ADDRESS: AddressState = {
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

const INITIAL_FORM: FormState = {
  personType: 'pf',
  document: '',
  name: '',
  tradeName: '',
  email: '',
  phone: '',
  phoneSecondary: '',
  birthDate: '',
  address: { ...INITIAL_ADDRESS },
};

const formatDocument = (value: string): string => {
  const digits = onlyNumbers(value);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return digits
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const formatZip = (value: string): string => {
  const digits = onlyNumbers(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatPhone = (value: string): string => {
  const has_plus = value.trim().startsWith('+');
  const digits = onlyNumbers(value).slice(0, 13);

  if (digits.length === 0) {
    return '';
  }

  if (has_plus || digits.length > 11) {
    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const first = digits.slice(4, 9);
    const last = digits.slice(9, 13);

    let out = `+${country}`;

    if (area) {
      out += ` (${area}`;
    }

    if (area.length === 2) {
      out += ')';
    }

    if (first) {
      out += ` ${first}`;
    }

    if (last) {
      out += `-${last}`;
    }

    return out.trim();
  }

  const area = digits.slice(0, 2);
  const middle_len = digits.length > 10 ? 5 : 4;
  const middle = digits.slice(2, 2 + middle_len);
  const last = digits.slice(2 + middle_len);
  let out = '';

  if (area) {
    out += `(${area}`;
  }

  if (area.length === 2) {
    out += ')';
  }

  if (middle) {
    out += ` ${middle}`;
  }

  if (last) {
    out += `-${last}`;
  }

  return out.trim();
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ClientDialogResult = {
  id: string;
  name: string;
  isExisting: boolean;
};

export const ClientDialogForm = ({ onSubmit = () => {} }: { onSubmit?: (result?: ClientDialogResult) => void }) => {
  const { is_online, addClientToQueue } = useOfflineSyncContext();

  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('idle');
  const [existingClient, setExistingClient] = useState<Record<string, unknown> | null>(null);
  const [isZipLoading, setIsZipLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const last_fetched_doc_ref = useRef<string>('');
  const last_fetched_zip_ref = useRef<string>('');
  const name_input_ref = useRef<HTMLInputElement>(null);
  const is_online_ref = useRef(is_online);

  useEffect(() => {
    is_online_ref.current = is_online;
  }, [is_online]);

  const fields_disabled = documentStatus === 'idle' || documentStatus === 'loading';
  const fields_read_only = documentStatus === 'found';
  const all_disabled = fields_disabled || fields_read_only;

  const updateForm = (patch: Partial<FormState>): void => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const updateAddress = (patch: Partial<AddressState>): void => {
    setForm(prev => ({ ...prev, address: { ...prev.address, ...patch } }));
  };

  const resetForm = (): void => {
    setForm({ ...INITIAL_FORM });
    setDocumentStatus('idle');
    setExistingClient(null);
    last_fetched_doc_ref.current = '';
  };

  const populateFromClient = (client: Record<string, unknown>): void => {
    const addr = (client.address as AddressState) ?? INITIAL_ADDRESS;

    setForm({
      personType: (client.person_type as 'pf' | 'pj') ?? 'pf',
      document: formatDocument(String(client.document ?? '')),
      name: String(client.name ?? ''),
      tradeName: String(client.trade_name ?? ''),
      email: String(client.email ?? ''),
      phone: String(client.phone ?? ''),
      phoneSecondary: String(client.phone_secondary ?? ''),
      birthDate: client.birth_date ? String(client.birth_date).slice(0, 10) : '',
      address: {
        zipCode: addr.zipCode ?? '',
        street: addr.street ?? '',
        number: addr.number ?? '',
        complement: addr.complement ?? '',
        neighborhood: addr.neighborhood ?? '',
        city: addr.city ?? '',
        state: addr.state ?? '',
      },
    });
  };

  // ─── Document lookup ──────────────────────────────────────────────────────

  useEffect(() => {
    const digits = onlyNumbers(form.document);

    if (digits.length < 11) {
      if (last_fetched_doc_ref.current) {
        resetForm();
      }

      return;
    }

    const is_cpf_complete = digits.length === 11 && isCpf(digits);
    const is_cnpj_complete = digits.length === 14 && isCnpj(digits);

    if (!is_cpf_complete && !is_cnpj_complete) {
      return;
    }

    if (digits === last_fetched_doc_ref.current) {
      return;
    }

    if (!is_online_ref.current) {
      last_fetched_doc_ref.current = digits;
      updateForm({ personType: digits.length === 11 ? 'pf' : 'pj' });
      setDocumentStatus('not-found');
      setExistingClient(null);
      setTimeout(() => name_input_ref.current?.focus(), 50);
      return;
    }

    last_fetched_doc_ref.current = digits;
    let cancelled = false;

    const run = async (): Promise<void> => {
      setDocumentStatus('loading');
      setExistingClient(null);

      try {
        if (is_cpf_complete) {
          updateForm({ personType: 'pf' });

          const result = await lookupClientByDocument(digits);

          if (cancelled) {
            return;
          }

          if (result.status === 200 && result.data) {
            setExistingClient(result.data as Record<string, unknown>);
            populateFromClient(result.data as Record<string, unknown>);
            setDocumentStatus('found');
            toast.info('Cliente encontrado na base.');
            return;
          }

          setDocumentStatus('not-found');
          setTimeout(() => name_input_ref.current?.focus(), 50);
        }

        if (is_cnpj_complete) {
          updateForm({ personType: 'pj' });

          const result = await lookupCompanyByCnpj(digits);

          if (cancelled) {
            return;
          }

          if (result.existingClient) {
            setExistingClient(result.existingClient as Record<string, unknown>);
            populateFromClient(result.existingClient as Record<string, unknown>);
            setDocumentStatus('found');
            toast.info('Empresa encontrada na base.');
            return;
          }

          if (result.company) {
            const company = result.company;
            const cidadeParts = (company.cidadeUf ?? '').split('/');

            setForm(prev => ({
              ...prev,
              personType: 'pj',
              name: prev.name || company.razaoSocial,
              tradeName: prev.tradeName || company.nomeFantasia,
              phone: prev.phone || (company.telefone ? formatPhoneBR(company.telefone) : ''),
              email: prev.email || company.email,
              address: {
                ...prev.address,
                street: prev.address.street || company.endereco,
                neighborhood: prev.address.neighborhood || company.bairro,
                city: prev.address.city || (cidadeParts[0]?.trim() ?? ''),
                state: prev.address.state || (cidadeParts[1]?.trim() ?? ''),
                zipCode: prev.address.zipCode || company.cep,
              },
            }));

            toast.success('Dados da empresa preenchidos.');
          }

          setDocumentStatus('not-found');
          setTimeout(() => name_input_ref.current?.focus(), 50);
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
  }, [form.document]);

  // ─── CEP lookup ───────────────────────────────────────────────────────────

  useEffect(() => {
    const digits = onlyNumbers(form.address.zipCode);

    if (digits.length !== 8) {
      return;
    }

    if (digits === last_fetched_zip_ref.current) {
      return;
    }

    if (!is_online_ref.current) {
      return;
    }

    last_fetched_zip_ref.current = digits;
    let cancelled = false;

    const run = async (): Promise<void> => {
      setIsZipLoading(true);

      try {
        const result = await lookupAddressByZip(digits);

        if (cancelled) {
          return;
        }

        if (!result) {
          toast.error('CEP não encontrado.');
          return;
        }

        updateAddress({
          street: form.address.street || result.street,
          neighborhood: form.address.neighborhood || result.neighborhood,
          city: form.address.city || result.city,
          state: form.address.state || result.state,
        });
      } finally {
        if (!cancelled) {
          setIsZipLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [form.address.zipCode]);

  // ─── Validation & Submit ──────────────────────────────────────────────────

  const validate = (): boolean => {
    const digits = onlyNumbers(form.document);

    if (!digits) {
      toast.error('Informe o CPF ou CNPJ.');
      return false;
    }

    if (digits.length !== 11 && digits.length !== 14) {
      toast.error('CPF deve ter 11 dígitos ou CNPJ 14 dígitos.');
      return false;
    }

    if (documentStatus === 'found') {
      return true;
    }

    if (!form.name.trim()) {
      toast.error('Nome é obrigatório.');
      return false;
    }

    if (!form.phone.trim() && !form.phoneSecondary.trim()) {
      toast.error('Informe ao menos um telefone ou WhatsApp.');
      return false;
    }

    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      toast.error('E-mail inválido.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) {
      return;
    }

    if (documentStatus === 'found' && existingClient) {
      onSubmit({
        id: String(existingClient.id),
        name: String(existingClient.name),
        isExisting: true,
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        person_type: form.personType,
        name: form.name,
        trade_name: form.tradeName || undefined,
        document: onlyNumbers(form.document) || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        phone_secondary: form.phoneSecondary || undefined,
        birth_date: form.birthDate || undefined,
        address: {
          zipCode: onlyNumbers(form.address.zipCode) || undefined,
          street: form.address.street || undefined,
          number: form.address.number || undefined,
          complement: form.address.complement || undefined,
          neighborhood: form.address.neighborhood || undefined,
          city: form.address.city || undefined,
          state: form.address.state || undefined,
        },
        client_created_at: new Date().toISOString(),
      };

      if (!is_online) {
        const offline_id = crypto.randomUUID();
        addClientToQueue(offline_id, payload);
        toast.success('Cliente salvo localmente. Será sincronizado ao reconectar.');
        document.dispatchEvent(new Event('clients:updated'));
        onSubmit({ id: offline_id, name: form.name, isExisting: false });
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

  const digits = onlyNumbers(form.document);
  const documentLabel = digits.length < 11 ? 'CPF ou CNPJ' : form.personType === 'pj' ? 'CNPJ' : 'CPF';
  const documentPlaceholder = form.personType === 'pj' ? '00.000.000/0000-00' : '000.000.000-00';

  return (
    <div>
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

      <div className="mt-6 space-y-4">
        {/* Row 1: Documento + Nome */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="document-input">{documentLabel} *</Label>
            <div className="relative">
              <Input
                id="document-input"
                value={form.document}
                onChange={e => updateForm({ document: formatDocument(e.target.value) })}
                placeholder={documentPlaceholder}
                inputMode="numeric"
                autoFocus
                disabled={fields_read_only}
              />
              {documentStatus === 'loading' && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Informe o CPF ou CNPJ</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name-input">{form.personType === 'pj' ? 'Razão Social' : 'Nome Completo'} *</Label>
            <Input
              ref={name_input_ref}
              id="name-input"
              value={form.name}
              onChange={e => updateForm({ name: e.target.value })}
              placeholder={all_disabled ? `Preenchido automaticamente via ${documentLabel}` : 'Ex: João da Silva'}
              disabled={all_disabled}
            />
          </div>
        </div>

        {/* PJ-only: Nome Fantasia */}
        {form.personType === 'pj' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="trade-name-input">Nome Fantasia</Label>
            <Input
              id="trade-name-input"
              value={form.tradeName}
              onChange={e => updateForm({ tradeName: e.target.value })}
              placeholder={all_disabled ? 'Preenchido automaticamente via CNPJ' : 'Ex: Loja Central'}
              disabled={all_disabled}
            />
          </div>
        )}

        {/* Row 2: Telefone + WhatsApp + Email (+ Nascimento se PF) */}
        <div className={`grid grid-cols-2 gap-4 ${form.personType === 'pj' ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone-input">Telefone</Label>
            <Input
              id="phone-input"
              value={form.phone}
              onChange={e => updateForm({ phone: formatPhone(e.target.value) })}
              placeholder={all_disabled ? `Via ${documentLabel}` : '(00) 00000-0000'}
              disabled={all_disabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone-secondary-input">WhatsApp</Label>
            <Input
              id="phone-secondary-input"
              value={form.phoneSecondary}
              onChange={e => updateForm({ phoneSecondary: formatPhone(e.target.value) })}
              placeholder={all_disabled ? `Via ${documentLabel}` : '(00) 00000-0000'}
              disabled={all_disabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email-input">Email</Label>
            <Input
              id="email-input"
              type="email"
              value={form.email}
              onChange={e => updateForm({ email: e.target.value })}
              placeholder={all_disabled ? `Via ${documentLabel}` : 'nome@email.com'}
              disabled={all_disabled}
            />
          </div>

          {form.personType === 'pf' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="birth-date-input">Data de Nascimento</Label>
              <Input
                id="birth-date-input"
                type="date"
                value={form.birthDate}
                onChange={e => updateForm({ birthDate: e.target.value })}
                disabled={all_disabled}
              />
            </div>
          )}
        </div>

        {/* Row 3: CEP + Endereço + Número + Bairro */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="zip-input">CEP</Label>
            <div className="relative">
              <Input
                id="zip-input"
                value={form.address.zipCode}
                onChange={e => updateAddress({ zipCode: formatZip(e.target.value) })}
                placeholder={all_disabled ? `Via ${documentLabel}` : '00000-000'}
                inputMode="numeric"
                disabled={all_disabled}
              />
              {isZipLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="street-input">Endereço</Label>
            <Input
              id="street-input"
              value={form.address.street}
              onChange={e => updateAddress({ street: e.target.value })}
              placeholder={all_disabled ? 'Preenchido automaticamente via CEP' : 'Rua, Avenida...'}
              disabled={all_disabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="number-input">Número</Label>
            <Input
              id="number-input"
              value={form.address.number}
              onChange={e => updateAddress({ number: e.target.value })}
              placeholder={all_disabled ? `Via ${documentLabel}` : 'Nº'}
              disabled={all_disabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="neighborhood-input">Bairro</Label>
            <Input
              id="neighborhood-input"
              value={form.address.neighborhood}
              onChange={e => updateAddress({ neighborhood: e.target.value })}
              placeholder={all_disabled ? 'Preenchido automaticamente via CEP' : 'Bairro'}
              disabled={all_disabled}
            />
          </div>
        </div>

        {/* Row 4: Cidade + UF */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-2 col-span-2">
            <Label htmlFor="city-input">Cidade</Label>
            <Input
              id="city-input"
              value={form.address.city}
              onChange={e => updateAddress({ city: e.target.value })}
              placeholder={all_disabled ? 'Preenchido automaticamente via CEP' : 'Cidade'}
              disabled={all_disabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="state-input">UF</Label>
            <Input
              id="state-input"
              value={form.address.state}
              onChange={e => updateAddress({ state: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder={all_disabled ? 'UF' : 'SP'}
              maxLength={2}
              disabled={all_disabled}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="mt-6 flex flex-row justify-between gap-2">
        <Button type="button" variant="ghost" onClick={() => onSubmit()}>
          Cancelar
        </Button>
        <div className="flex-1" />
        <SubmitButton isSubmitting={isSubmitting} onClick={handleSubmit}>
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
    </div>
  );
};
