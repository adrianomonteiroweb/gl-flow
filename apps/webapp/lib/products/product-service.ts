import { ProductRepository } from '@workspace/db';
import type { AvailableProduct, Product } from './types';

export type FetchProductsResult =
  | { success: true; products: AvailableProduct[] }
  | { success: false; error: string };

export const getAvailableProducts = async (
  workspaceId: string,
  city: string
): Promise<FetchProductsResult> => {
  try {
    const rows: Product[] = await ProductRepository.findAvailableByCity(workspaceId, city);

    const products: AvailableProduct[] = rows.map((row: Product, i: number) => ({
      ...row,
      index: i + 1,
    }));

    console.log('[ProductService] Produtos disponíveis:', products.length, '— cidade:', city);

    return { success: true, products };
  } catch (err) {
    console.error('[ProductService] Erro ao buscar produtos:', err);
    return { success: false, error: String(err) };
  }
};
