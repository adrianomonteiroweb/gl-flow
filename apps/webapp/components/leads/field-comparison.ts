import { onlyNumbers } from '@workspace/utils/text';

import type { MatchedClient } from './existing-client-match-dialog';

export type FieldMatchStatus = 'match' | 'divergent' | 'new_only' | 'existing_only';

export type FieldComparison = {
  field: 'name' | 'phone' | 'email';
  label: string;
  status: FieldMatchStatus;
  new_value: string | null;
  existing_value: string | null;
};

export type ClientComparison = {
  client: MatchedClient;
  fields: FieldComparison[];
  has_divergence: boolean;
  divergent_count: number;
};

const normalizePhone = (raw: string | null | undefined): string | null => {
  if (!raw) {
    return null;
  }

  let digits = onlyNumbers(raw);

  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  return digits.length >= 10 ? digits : null;
};

const normalizeEmail = (raw: string | null | undefined): string | null => {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim().toLowerCase();

  return trimmed.length > 0 ? trimmed : null;
};

const normalizeName = (raw: string | null | undefined): string | null => {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim().toLowerCase();

  return trimmed.length > 0 ? trimmed : null;
};

const compareField = (
  field: FieldComparison['field'],
  label: string,
  new_raw: string | null | undefined,
  existing_raw: string | null | undefined,
  normalize: (v: string | null | undefined) => string | null
): FieldComparison => {
  const new_norm = normalize(new_raw);
  const existing_norm = normalize(existing_raw);
  const new_value = new_raw?.trim() || null;
  const existing_value = existing_raw?.trim() || null;

  if (new_norm && existing_norm) {
    return { field, label, status: new_norm === existing_norm ? 'match' : 'divergent', new_value, existing_value };
  }

  if (new_norm && !existing_norm) {
    return { field, label, status: 'new_only', new_value, existing_value: null };
  }

  if (!new_norm && existing_norm) {
    return { field, label, status: 'existing_only', new_value: null, existing_value };
  }

  return { field, label, status: 'match', new_value: null, existing_value: null };
};

export const compareLeadWithClient = (
  lead: { name: string; phone: string; email?: string },
  client: MatchedClient
): ClientComparison => {
  const raw_fields: FieldComparison[] = [
    compareField('name', 'Nome', lead.name, client.name, normalizeName),
    compareField('phone', 'Telefone', lead.phone, client.phone, normalizePhone),
    compareField('email', 'E-mail', lead.email, client.email, normalizeEmail),
  ];

  const divergent = raw_fields.filter(f => f.status === 'divergent');
  const non_divergent = raw_fields.filter(f => f.status !== 'divergent');

  return {
    client,
    fields: [...divergent, ...non_divergent],
    has_divergence: divergent.length > 0,
    divergent_count: divergent.length,
  };
};
