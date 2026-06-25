import { z } from 'zod';

import { onlyNumbers, isCpf, isCnpj } from '@workspace/utils/text';
import { MARITAL_STATUS_VALUES } from '@/lib/clients/marital-status';

// ─── Input formatters (UI-only) ───────────────────────────────────────────────

export const formatDocument = (value: string): string => {
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

export const formatCpfInput = (value: string): string => {
  return onlyNumbers(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatZip = (value: string): string => {
  const digits = onlyNumbers(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const formatPhone = (value: string): string => {
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

// ─── Form schema ──────────────────────────────────────────────────────────────

const isValidPhone = (value: string): boolean => {
  if (!value || value.trim() === '') {
    return true;
  }

  const digits = onlyNumbers(value);

  return digits.length >= 10 && digits.length <= 13;
};

const addressFormSchema = z.object({
  zipCode: z.string().refine(value => onlyNumbers(value).length === 8, 'CEP inválido'),
  street: z.string().min(1, 'Endereço é obrigatório'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().min(1, 'Complemento é obrigatório'),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'UF inválida'),
});

const partnerFormSchema = z.object({
  document: z.string().refine(value => isCpf(onlyNumbers(value)), 'CPF inválido'),
  name: z.string().min(1, 'Nome é obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  phone: z.string().refine(isValidPhone, 'Telefone inválido'),
  email: z.string().email('E-mail inválido'),
  marital_status: z.string().min(1, 'Estado civil é obrigatório'),
  has_cnh: z.boolean(),
  address: addressFormSchema,
});

export const clientFormSchema = z
  .object({
    personType: z.enum(['pf', 'pj']),
    document: z.string(),
    name: z.string().min(1, 'Nome é obrigatório'),
    tradeName: z.string().optional(),
    email: z.string().email('E-mail inválido'),
    phone: z.string().optional().refine(value => value === undefined || isValidPhone(value), 'Telefone inválido'),
    phoneSecondary: z
      .string()
      .optional()
      .refine(value => value === undefined || isValidPhone(value), 'WhatsApp inválido'),
    birthDate: z.string().optional(),
    foundingDate: z.string().optional(),
    maritalStatus: z.string().optional(),
    municipalRegistration: z.string().optional(),
    stateRegistration: z.string().optional(),
    address: addressFormSchema,
    partners: z.array(partnerFormSchema),
  })
  .superRefine((data, ctx) => {
    const digits = onlyNumbers(data.document);

    if (data.personType === 'pf' && !isCpf(digits)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['document'], message: 'CPF inválido' });
    }

    if (data.personType === 'pj' && !isCnpj(digits)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['document'], message: 'CNPJ inválido' });
    }

    if (data.personType === 'pf') {
      const hasPhone = data.phone && onlyNumbers(data.phone).length >= 10;
      const hasWhatsApp = data.phoneSecondary && onlyNumbers(data.phoneSecondary).length >= 10;

      if (!hasPhone && !hasWhatsApp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phoneSecondary'],
          message: 'Informe WhatsApp ou telefone',
        });
      }

      if (!data.birthDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['birthDate'], message: 'Data de nascimento é obrigatória' });
      }

      if (!data.maritalStatus) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maritalStatus'], message: 'Estado civil é obrigatório' });
      }
    }

    if (data.personType === 'pj') {
      if (!data.foundingDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['foundingDate'], message: 'Data de abertura é obrigatória' });
      }

      if (data.partners.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['partners'], message: 'Informe ao menos um sócio' });
      }
    }
  });

export type ClientFormValues = z.infer<typeof clientFormSchema>;
export type ClientAddressValues = z.infer<typeof addressFormSchema>;
export type ClientPartnerValues = z.infer<typeof partnerFormSchema>;

export const EMPTY_ADDRESS: ClientAddressValues = {
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

export const emptyPartner = (name = ''): ClientPartnerValues => ({
  document: '',
  name,
  birth_date: '',
  phone: '',
  email: '',
  marital_status: '',
  has_cnh: false,
  address: { ...EMPTY_ADDRESS },
});

export const DEFAULT_CLIENT_FORM: ClientFormValues = {
  personType: 'pf',
  document: '',
  name: '',
  tradeName: '',
  email: '',
  phone: '',
  phoneSecondary: '',
  birthDate: '',
  foundingDate: '',
  maritalStatus: '',
  municipalRegistration: '',
  stateRegistration: '',
  address: { ...EMPTY_ADDRESS },
  partners: [],
};

export const MARITAL_STATUS_VALUE_SET = new Set<string>(MARITAL_STATUS_VALUES);

// ─── Form value ⇄ API payload mapping ─────────────────────────────────────────

const sliceDate = (value: unknown): string => (value ? String(value).slice(0, 10) : '');

/** Maps a persisted client record into the form's value shape. */
export const clientToFormValues = (client: Record<string, any>): ClientFormValues => {
  const addr = (client.address as Record<string, string>) ?? {};
  const payload = (client.payload as Record<string, any>) ?? {};
  const seededPartners = Array.isArray(client.partners) ? (client.partners as Record<string, any>[]) : [];

  return {
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
  };
};

/** Maps the form's values into the API payload shape (digits only, jsonb extras). */
export const buildClientPayload = (
  values: ClientFormValues,
  options: { enrichment?: Record<string, unknown> | null } = {}
): Record<string, unknown> => {
  const extras: Record<string, unknown> = {};

  if (options.enrichment) {
    extras.cnpj = options.enrichment;
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
