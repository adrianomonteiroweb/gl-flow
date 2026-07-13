export type VehicleModelPayload = {
  mileage?: number | null;
  chassi?: string | null;
  color?: string | null;
  stock_entry_date?: string | null;
};

export type VehicleModel = {
  id: string;
  make: string;
  model: string;
  version: string | null;
  segment: string;
  condition: string;
  model_year: number | null;
  manufacture_year: number | null;
  price: string | number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order?: number;
  payload?: VehicleModelPayload | null;
};
