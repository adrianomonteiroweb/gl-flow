import { createHash } from 'crypto';

import { validatePasswordSync } from './password-rules';

const HIBP_API = 'https://api.pwnedpasswords.com/range/';
const TIMEOUT_MS = 5_000;

export const checkBreachedPassword = async (password: string): Promise<{ breached: boolean; count: number; error?: string }> => {
  try {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${HIBP_API}${prefix}`, {
      signal: controller.signal,
      headers: { 'Add-Padding': 'true' },
    });

    clearTimeout(timer);

    if (!response.ok) {
      return { breached: false, count: 0, error: `HaveIBeenPwned API returned ${response.status}` };
    }

    const body = await response.text();
    const lines = body.split('\n');

    for (const line of lines) {
      const [hash, countStr] = line.split(':');

      if (hash?.trim() === suffix) {
        const count = parseInt(countStr?.trim() ?? '0', 10);
        return { breached: true, count };
      }
    }

    return { breached: false, count: 0 };
  } catch (err) {
    console.error('HaveIBeenPwned check failed:', err);
    return { breached: false, count: 0, error: 'Não foi possível verificar senhas vazadas' };
  }
};

export const validatePasswordFull = async (password: string): Promise<{ valid: boolean; errors: string[] }> => {
  const sync_result = validatePasswordSync(password);

  if (!sync_result.valid) {
    return sync_result;
  }

  const breach_result = await checkBreachedPassword(password);

  if (breach_result.breached) {
    return {
      valid: false,
      errors: ['Esta senha foi encontrada em vazamentos de dados conhecidos. Escolha outra senha.'],
    };
  }

  return { valid: true, errors: [] };
};
