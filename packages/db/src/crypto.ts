import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

const getKey = (): Buffer => {
  const hex = process.env.WA_TOKEN_ENCRYPTION_KEY;
  if (!hex) throw new Error('WA_TOKEN_ENCRYPTION_KEY is not set');
  if (hex.length !== 64) throw new Error('WA_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  return Buffer.from(hex, 'hex');
};

// Output format: {iv_hex}:{authTag_hex}:{ciphertext_hex}
export const encryptToken = (plaintext: string): string => {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptToken = (ciphertext: string): string => {
  const key = getKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Invalid encrypted token format');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(parts[0], 'hex'));
  decipher.setAuthTag(Buffer.from(parts[1], 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[2], 'hex')),
    decipher.final(),
  ]).toString('utf8');
};
