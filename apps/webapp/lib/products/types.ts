import type { products_table } from '@workspace/db';

export type Product = typeof products_table.$inferSelect;

export type AvailableProduct = Product & {
  index: number;
};

export type CoverageCity = {
  city: string;
  state: string;
};

export type ProductSpecs = {
  speed_mbps?: number;
  download?: string;
  upload?: string;
  technology?: string;
  sku?: string;
  recurrence?: string;
  [key: string]: unknown;
};
