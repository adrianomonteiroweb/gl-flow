import type { VehicleModel } from '@/components/vehicle-catalog/types';

export type WizardStep = 'client' | 'vehicle' | 'proposal' | 'payment' | 'consorcio' | 'approval' | 'invoicing' | 'delivery';

export type PaymentMethod = 'avista' | 'financiamento' | 'consorcio';

export type PaymentChannel = 'pix' | 'card' | 'transfer';

export type WizardClient = {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type PaymentEntry = {
  id: string;
  method: PaymentChannel;
  amount: number;
  installments: number;
  card_brand: string | null;
  card_last4: string | null;
  status: 'pending' | 'paid';
  at: string;
};

export type ConsorcioPlan = {
  id: string;
  name: string;
  credit: number;
  installment: number;
  term: number;
  status: 'pre_approved' | 'simulating';
};

export type ApprovalStatus = 'idle' | 'pending' | 'approved';

// Percentual de entrada padrão para financiamento (mockup: "Entrada (30%)").
export const DOWN_PAYMENT_PCT = 30;

export const MAX_INSTALLMENTS = 12;

// `price` pode chegar como string (numeric do Postgres), number ou null.
export const vehiclePriceToNumber = (price: VehicleModel['price']): number => {
  const value = typeof price === 'string' ? Number(price) : price;

  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }

  return value;
};
