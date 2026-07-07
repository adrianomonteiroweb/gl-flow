import { onlyNumbers } from '@workspace/utils/text';

export const formatCurrencyInput = (raw: string): string => {
  const digits = onlyNumbers(raw);

  if (!digits) {
    return '';
  }

  const cents = parseInt(digits, 10);
  const value = cents / 100;

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parseCurrencyInput = (formatted: string): number => {
  const digits = onlyNumbers(formatted);

  if (!digits) {
    return 0;
  }

  return parseInt(digits, 10) / 100;
};

export const toCurrencyDisplay = (numericValue: number | string | null | undefined): string => {
  if (numericValue === null || numericValue === undefined) {
    return '';
  }

  const value = typeof numericValue === 'string' ? Number(numericValue) : numericValue;

  if (Number.isNaN(value) || value === 0) {
    return '';
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
