'use server';

import { fetchAddressByZip, type BrasilApiAddress } from '@/lib/brasilapi';

export const lookupAddressByZip = async (zip: string): Promise<BrasilApiAddress | null> => {
  return fetchAddressByZip(zip);
};
