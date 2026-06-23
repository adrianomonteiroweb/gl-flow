import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  dialect: 'postgresql',
  schemaFilter: 'public',
  schema: ['./src/schema.ts', './src/admin-schema.ts'],
  out: './migrations',

  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },

  verbose: true,
  strict: true,
} satisfies Config;
