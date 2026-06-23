import { formatCnpj, formatCurrency, formatCpf, formatPhone } from '@workspace/utils/text';
import { DateFormatter } from '@workspace/utils';
import type { AddressData } from '@/repositories/types';
import type { ProductSpecs } from '@/lib/products/types';

/**
 * Single source of truth for proposal/contract template variables.
 *
 * A variable is a token in the form {{NAMESPACE.FIELD}} that appears in the
 * template HTML. The editor uses {@link VARIABLE_GROUPS} to offer an
 * "insert variable" menu; the server uses {@link buildVariableValues} to map
 * each token to real data; and {@link resolveTemplateHtml} replaces the tokens
 * with their resolved (or manually filled) values.
 *
 * This module is intentionally free of server-only imports so it can be shared
 * between client (editor/preview) and server (actions).
 */

export type VariableDef = {
  token: string;
  label: string;
  /** true when the value cannot be auto-resolved and must be filled manually. */
  manual?: boolean;
};

export type VariableGroup = {
  namespace: string;
  label: string;
  variables: VariableDef[];
};

export const VARIABLE_GROUPS: VariableGroup[] = [
  {
    namespace: 'PESSOA',
    label: 'Pessoa (Lead)',
    variables: [
      { token: 'PESSOA.NOME', label: 'Nome' },
      { token: 'PESSOA.CPF', label: 'CPF', manual: true },
      { token: 'PESSOA.IDENTIDADE', label: 'RG', manual: true },
      { token: 'PESSOA.DATANASCIMENTO', label: 'Data de nascimento', manual: true },
      { token: 'PESSOA.NOMEDAMAE', label: 'Nome da mãe', manual: true },
      { token: 'PESSOA.PAIS', label: 'País' },
      { token: 'PESSOA.RUA', label: 'Rua' },
      { token: 'PESSOA.NUMERO', label: 'Número' },
      { token: 'PESSOA.BAIRRO', label: 'Bairro' },
      { token: 'PESSOA.CIDADE', label: 'Cidade' },
      { token: 'PESSOA.ESTADO', label: 'Estado' },
      { token: 'PESSOA.CEP', label: 'CEP' },
      { token: 'PESSOA.EMAIL', label: 'E-mail' },
      { token: 'PESSOA.CELULAR', label: 'Telefone / WhatsApp' },
    ],
  },
  {
    namespace: 'ITEM',
    label: 'Item / Plano',
    variables: [{ token: 'ITEM.DESCRICAO', label: 'Descrição do plano' }],
  },
  {
    namespace: 'CONEXAO',
    label: 'Conexão',
    variables: [
      { token: 'CONEXAO.DOWNLOADMAX', label: 'Velocidade de download' },
      { token: 'CONEXAO.UPLOADMAX', label: 'Velocidade de upload' },
    ],
  },
  {
    namespace: 'CONTRATO',
    label: 'Contrato',
    variables: [
      { token: 'CONTRATO.VALOR', label: 'Valor mensal' },
      { token: 'CONTRATO.DIA_COBRANCA', label: 'Dia de cobrança', manual: true },
      { token: 'CONTRATO.ENDERECO.CIDADE', label: 'Cidade (assinatura)' },
    ],
  },
  {
    namespace: 'PRESTADORA',
    label: 'Prestadora / Empresa',
    variables: [
      { token: 'PRESTADORA.RAZAO_SOCIAL', label: 'Nome empresarial' },
      { token: 'PRESTADORA.NOME_FANTASIA', label: 'Nome fantasia' },
      { token: 'PRESTADORA.CNPJ', label: 'CNPJ' },
      { token: 'PRESTADORA.INSCRICAO_ESTADUAL', label: 'Inscrição estadual', manual: true },
      { token: 'PRESTADORA.ATO_AUTORIZACAO_ANATEL', label: 'Ato de autorização — Anatel', manual: true },
      { token: 'PRESTADORA.TELEFONE', label: 'Telefone' },
      { token: 'PRESTADORA.ENDERECO', label: 'Endereço' },
      { token: 'PRESTADORA.BAIRRO', label: 'Bairro' },
      { token: 'PRESTADORA.CIDADE_UF', label: 'Cidade/UF' },
      { token: 'PRESTADORA.CEP', label: 'CEP' },
      { token: 'PRESTADORA.SITE', label: 'Site', manual: true },
      { token: 'PRESTADORA.EMAIL', label: 'E-mail', manual: true },
    ],
  },
];

/** Flat lookup table of token -> label for all known variables. */
const LABEL_BY_TOKEN = new Map<string, string>(
  VARIABLE_GROUPS.flatMap(group => group.variables.map(v => [v.token, v.label] as const))
);

/** Tokens that must be filled manually (no automatic data source). */
const MANUAL_TOKENS = new Set<string>(
  VARIABLE_GROUPS.flatMap(group => group.variables.filter(v => v.manual).map(v => v.token))
);

const BRAZILIAN_DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;

export const getVariableLabel = (token: string): string => LABEL_BY_TOKEN.get(token) ?? token;

export const isManualVariable = (token: string): boolean => MANUAL_TOKENS.has(token);

export const normalizeVariableValue = (token: string, value: string): string => {
  if (!value) return value;

  switch (token) {
    case 'PESSOA.CPF': {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 11) return formatCpf(digits);
      return value;
    }
    case 'PESSOA.DATANASCIMENTO': {
      if (BRAZILIAN_DATE_REGEX.test(value)) return value;

      const trimmedValue = value.trim();
      if (ISO_DATE_REGEX.test(trimmedValue)) {
        const formatted = DateFormatter.date(trimmedValue);
        return formatted === '-' ? value : formatted;
      }

      const digits = value.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 8) return value;
      if (digits.length === 8) {
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      }

      return value;
    }
    default:
      return value;
  }
};

/** Matches {{ NAMESPACE.FIELD }} tokens (letters, digits, underscore and dot). */
export const TOKEN_REGEX = /\{\{\s*([A-Z0-9_.]+)\s*\}\}/g;

export type VariableContext = {
  lead?: Record<string, any> | null;
  chat?: Record<string, any> | null;
  /** Selected plan / product (AvailableProduct | Product | chat.payload.selected_plan). */
  product?: Record<string, any> | null;
  workspace?: Record<string, any> | null;
};

const str = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

/**
 * Resolves the real value for every known variable from the given context.
 * Fields with no available data resolve to an empty string and are expected to
 * be filled manually in the review modal before generating the document.
 */
export const buildVariableValues = (ctx: VariableContext): Record<string, string> => {
  const lead = ctx.lead ?? {};
  const leadPayload = (lead.payload ?? {}) as Record<string, any>;
  const address = (lead.address ?? {}) as AddressData;
  const product = ctx.product ?? null;
  const specs = (product?.specs ?? {}) as ProductSpecs;
  const workspace = ctx.workspace ?? {};
  const workspacePayload = (workspace.payload ?? {}) as Record<string, any>;
  const company = (workspacePayload.company ?? {}) as Record<string, any>;

  const rawPrice = product ? (product.loyalty_price ?? product.base_price) : null;
  const price = rawPrice !== null && rawPrice !== undefined && rawPrice !== '' ? formatCurrency(Number(rawPrice)) : '';

  return {
    'PESSOA.NOME': str(lead.name),
    'PESSOA.CPF': leadPayload.cpf ? formatCpf(str(leadPayload.cpf)) : '',
    'PESSOA.IDENTIDADE': str(leadPayload.rg ?? leadPayload.identidade),
    'PESSOA.DATANASCIMENTO': (() => {
      const raw = leadPayload.birth_date ?? leadPayload.data_nascimento;
      if (!raw) return '';
      const formatted = DateFormatter.date(raw);
      return formatted === '-' ? str(raw) : formatted;
    })(),
    'PESSOA.NOMEDAMAE': str(leadPayload.mother_name ?? leadPayload.nome_da_mae),
    'PESSOA.PAIS': str(leadPayload.country ?? 'Brasil'),
    'PESSOA.RUA': str(address.street),
    'PESSOA.NUMERO': str(address.number),
    'PESSOA.BAIRRO': str(address.neighborhood),
    'PESSOA.CIDADE': str(address.city),
    'PESSOA.ESTADO': str(address.state),
    'PESSOA.CEP': str(address.zipCode),
    'PESSOA.EMAIL': str(lead.email),
    'PESSOA.CELULAR': lead.phone ? (formatPhone(str(lead.phone)) ?? str(lead.phone)) : '',
    'ITEM.DESCRICAO': str(product?.name ?? product?.description),
    'CONEXAO.DOWNLOADMAX': str(specs.download),
    'CONEXAO.UPLOADMAX': str(specs.upload),
    'CONTRATO.VALOR': price,
    'CONTRATO.DIA_COBRANCA': str(leadPayload.billing_day),
    'CONTRATO.ENDERECO.CIDADE': str(address.city),
    'PRESTADORA.RAZAO_SOCIAL': str(company.razaoSocial),
    'PRESTADORA.NOME_FANTASIA': str(company.nomeFantasia),
    'PRESTADORA.CNPJ': company.cnpj ? formatCnpj(str(company.cnpj)) : '',
    'PRESTADORA.INSCRICAO_ESTADUAL': str(company.inscricaoEstadual),
    'PRESTADORA.ATO_AUTORIZACAO_ANATEL': str(company.atoAutorizacaoAnatel),
    'PRESTADORA.TELEFONE': str(company.telefone),
    'PRESTADORA.ENDERECO': str(company.endereco),
    'PRESTADORA.BAIRRO': str(company.bairro),
    'PRESTADORA.CIDADE_UF': str(company.cidadeUf),
    'PRESTADORA.CEP': str(company.cep),
    'PRESTADORA.SITE': str(company.site),
    'PRESTADORA.EMAIL': str(company.email),
    // Back-compat: legacy PLATAFORMA tokens still resolve (sourced from the company profile).
    'PLATAFORMA.NOME': str(company.razaoSocial || workspace.name),
    'PLATAFORMA.CNPJ': company.cnpj ? formatCnpj(str(company.cnpj)) : workspacePayload.cnpj ? str(workspacePayload.cnpj) : '',
  };
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Replaces every {{TOKEN}} in the HTML with its value from `values`.
 * Unknown / empty tokens are replaced with an empty string. Values are
 * HTML-escaped so lead data can never break the document markup.
 */
export const resolveTemplateHtml = (html: string, values: Record<string, string>): string => {
  if (!html) return '';
  return html.replace(TOKEN_REGEX, (_match, token: string) => {
    const value = values[token];
    return value ? escapeHtml(value) : '';
  });
};

/** Returns the unique list of tokens present in the given HTML, in order of appearance. */
export const extractTokens = (html: string): string[] => {
  if (!html) return [];
  const seen = new Set<string>();
  const regex = new RegExp(TOKEN_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) seen.add(match[1]);
  }
  return Array.from(seen);
};
