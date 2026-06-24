import * as dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

const is_local = process.env.LOCAL === '1';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  max: is_local ? 10 : 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  ...(!is_local && { ssl: { rejectUnauthorized: true } }),
});

export const db = drizzle(pool, { schema: { ...schema } });
export default db;
