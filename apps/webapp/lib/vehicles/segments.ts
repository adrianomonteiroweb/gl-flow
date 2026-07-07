export const VEHICLE_SEGMENTS = ['street', 'scooter', 'adventure', 'offroad'] as const;
export type VehicleSegment = (typeof VEHICLE_SEGMENTS)[number];

export const SEGMENT_LABELS: Record<VehicleSegment, string> = {
  street: 'Street',
  scooter: 'Scooter',
  adventure: 'Adventure',
  offroad: 'Off-Road',
};

export const SEGMENT_OPTIONS = VEHICLE_SEGMENTS.map(value => ({
  value,
  label: SEGMENT_LABELS[value],
}));

export const segmentLabel = (segment: string | null | undefined): string => {
  if (segment && segment in SEGMENT_LABELS) {
    return SEGMENT_LABELS[segment as VehicleSegment];
  }

  return segment ?? '';
};

export const VEHICLE_CONDITIONS = ['new', 'used'] as const;
export type VehicleCondition = (typeof VEHICLE_CONDITIONS)[number];

export const CONDITION_LABELS: Record<VehicleCondition, string> = {
  new: 'Novo (0km)',
  used: 'Seminovo',
};

export const CONDITION_OPTIONS = VEHICLE_CONDITIONS.map(v => ({
  value: v,
  label: CONDITION_LABELS[v],
}));

export const conditionLabel = (condition: string | null | undefined): string => {
  if (condition && condition in CONDITION_LABELS) {
    return CONDITION_LABELS[condition as VehicleCondition];
  }

  return condition ?? '';
};

export const formatModelYear = (model: { model_year?: number | null; manufacture_year?: number | null }): string => {
  const model_year = model.model_year ?? null;
  const manufacture_year = model.manufacture_year ?? null;

  if (manufacture_year && model_year) {
    return `${manufacture_year}/${model_year}`;
  }

  const single = model_year ?? manufacture_year;

  return single ? `${single}/${single}` : '';
};
