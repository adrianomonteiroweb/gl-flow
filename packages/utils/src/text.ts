/**
 * Capitalizes the first letter of each word in a string
 */
export const capitalize = (str: string): string => {
  const parts = str.split(' ');
  const capitalizedParts = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
  return capitalizedParts.join(' ').trim();
};

/**
 * Removes all non-numeric characters from a string
 */
export const onlyNumbers = (str: string): string => {
  return str.replace(/\D/g, '');
};

/**
 * Normalizes text and removes forward slashes for path usage
 */
export const normalize2Path = (text: string): string => {
  return normalize(text).replace('/', '');
};

/**
 * Normalizes text by removing accents and trimming whitespace
 */
export const normalize = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Checks if a value is a valid CNPJ format (14 digits)
 */
export const isCnpj = (value: string): boolean => {
  return onlyNumbers(value).length === 14;
};

/**
 * Checks if a string is a valid CPF format (11 digits)
 */
export const isCpf = (cpf: string): boolean => {
  return onlyNumbers(cpf).length === 11;
};

/**
 * Formats a string as CPF or CNPJ based on length
 */
export const cpfOrCnpj = (value: string): string => {
  const numbersOnly = onlyNumbers(value);

  if (numbersOnly.length === 11) {
    return formatCpf(numbersOnly);
  }

  return formatCnpj(numbersOnly);
};

/**
 * Formats a CNPJ string with proper punctuation
 */
export const formatCnpj = (cnpj: string): string => {
  const numbersOnly = onlyNumbers(cnpj);
  return numbersOnly.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Formats a CPF string with proper punctuation
 */
export const formatCpf = (cpf: string): string => {
  const numbersOnly = onlyNumbers(cpf);
  return numbersOnly.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formats a number as currency in Brazilian format
 */
export const formatCurrency = (value: number, currency: string = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
};

/**
 * Formats account number with leading zeros
 */
export const formatAccountNumber = (accountNumber: string = ''): string => {
  return onlyNumbers(accountNumber).padStart(6, '0');
};

export const formatPercentage = (value: number, total: number) => {
  if (total === 0) return '0%';
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / total);
};

/**
 * Formats a phone number in Brazilian format
 */
export const formatPhone = (phone: string): string | null => {
  if (!phone) {
    return null;
  }

  const regex = /^(\d{2})(\d{5})(\d{4})$/;
  const phoneNumber = onlyNumbers(phone).replace(/^55/, '');

  if (phoneNumber.length !== 11) {
    return null;
  }

  return phoneNumber.replace(regex, '($1) $2-$3');
};

/**
 * Formats a Brazilian phone number, gracefully handling landlines (10 digits),
 * mobiles (11 digits) and 0800 numbers. Unlike {@link formatPhone}, it never
 * returns null: when the digit count is unexpected it returns the original input.
 */
export const formatPhoneBR = (phone: string): string => {
  if (!phone) {
    return '';
  }

  const digits = onlyNumbers(phone).replace(/^55/, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('0800') && digits.length === 11) {
    return digits.replace(/^(0800)(\d{3})(\d{4})$/, '$1 $2 $3');
  }

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return phone;
};

/**
 * Formats a Brazilian postal code (CEP) as #####-### once it has 8 digits.
 */
export const formatCep = (value: string): string => {
  const digits = onlyNumbers(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

/**
 * Extracts DDD (area code) from a formatted phone number
 */
export const extractDdd = (phone: string): string | null => {
  const formattedPhone = formatPhone(phone);

  if (!formattedPhone) {
    return null;
  }

  const regex = /\((\d{2})\)/;
  const match = formattedPhone.match(regex);

  if (!match) {
    return null;
  }

  // Return the DDD without parentheses
  return match[1] || null;
};

/**
 * Converts camelCase string to snake_case
 */
export const camelToSnake = (str: string): string => {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
};

/**
 * Legacy export for backward compatibility
 * @deprecated Use individual functions instead
 */
export const TextFormatter = {
  capitalize,
  onlyNumbers,
  normalize2Path,
  normalize,
  isCnpj,
  cpfOrCnpj,
  cnpj: formatCnpj,
  cpf: formatCpf,
  currency: formatCurrency,
  cc: formatAccountNumber,
  formatPhone,
  ddd: extractDdd,
  camelToSnake,
} as const;

export default TextFormatter;
