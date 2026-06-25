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

export type PartnerData = {
  document: string;
  name: string;
  birth_date: string;
  phone: string;
  email: string;
  marital_status: string;
  has_cnh: boolean;
  address: AddressData;
};
