import { InferInsertModel } from 'drizzle-orm';
import { users_table } from './schema';

export type User = InferInsertModel<typeof users_table>;
