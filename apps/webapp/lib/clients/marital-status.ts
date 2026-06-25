export const MARITAL_STATUS_VALUES = ['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel', 'separado'] as const;

export type MaritalStatus = (typeof MARITAL_STATUS_VALUES)[number];

export const MARITAL_STATUS_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União estável' },
  { value: 'separado', label: 'Separado(a)' },
];

export const maritalStatusLabel = (value?: string | null): string => {
  return MARITAL_STATUS_OPTIONS.find(option => option.value === value)?.label ?? '—';
};
