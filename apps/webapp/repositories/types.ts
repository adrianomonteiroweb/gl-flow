import { InferInsertModel } from 'drizzle-orm';
import { users_table } from '@workspace/db';

export type User = InferInsertModel<typeof users_table> & { payload: any };

export type AddressData = {
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};
