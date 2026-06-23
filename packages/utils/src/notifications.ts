export const normalizePhoneBR = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return `${digits}`;
  if (digits.length === 11) return `55${digits}`;
  if (digits.length === 10) return `55${digits}`;
  return phone;
};
