'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { getActiveVehicleModels } from '@/actions/vehicle-catalog';

import { cn } from '@workspace/ui/lib/utils';

import { CONDITION_OPTIONS } from '@/lib/vehicles/segments';
import { SEGMENT_OPTIONS } from '@/lib/vehicles/segments';

import type { ConditionFilter } from './condition-tabs';
import type { SegmentFilter } from './segment-tabs';
import { VehicleModelCard } from './vehicle-model-card';
import type { VehicleModel } from './types';

interface VehicleCatalogPickerProps {
  selectedId?: string | null;
  onSelect: (model: VehicleModel) => void;
}

export const VehicleCatalogPicker = ({ selectedId, onSelect }: VehicleCatalogPickerProps) => {
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [condition, setCondition] = useState<ConditionFilter>('all');
  const [segment, setSegment] = useState<SegmentFilter>('all');

  useEffect(() => {
    let active = true;

    getActiveVehicleModels()
      .then(result => {
        if (active && result.success) {
          setModels((result.data ?? []) as VehicleModel[]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const byCondition = condition === 'all' ? models : models.filter(m => m.condition === condition);
  const filtered = segment === 'all' ? byCondition : byCondition.filter(m => m.segment === segment);

  const conditionOptions: { value: ConditionFilter; label: string }[] = [{ value: 'all', label: 'Todos' }, ...CONDITION_OPTIONS];
  const segmentOptions: { value: SegmentFilter; label: string }[] = [{ value: 'all', label: 'Todos' }, ...SEGMENT_OPTIONS];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="hidden sm:block">
        <h3 className="text-base font-semibold text-foreground">Veículo de Interesse</h3>
        <p className="text-sm text-muted-foreground">Selecione o modelo Honda</p>
      </div>

      <div className="-mx-1 flex flex-wrap gap-1.5 px-1 pb-1 sm:gap-2 sm:pb-0">
        {conditionOptions.map(option => (
          <button
            key={`c-${option.value}`}
            type="button"
            onClick={() => setCondition(option.value)}
            aria-pressed={option.value === condition}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-4 sm:py-1.5 sm:text-xs',
              option.value === condition
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-transparent text-muted-foreground hover:bg-muted'
            )}>
            {option.label}
          </button>
        ))}
        <div className="mx-0.5 w-px shrink-0 self-stretch bg-border sm:hidden" />
        {segmentOptions.map(option => (
          <button
            key={`s-${option.value}`}
            type="button"
            onClick={() => setSegment(option.value)}
            aria-pressed={option.value === segment}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-4 sm:py-1.5 sm:text-xs',
              option.value === segment
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-transparent text-muted-foreground hover:bg-muted'
            )}>
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum veículo disponível no catálogo.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {filtered.map(model => (
            <VehicleModelCard key={model.id} model={model} selectable selected={model.id === selectedId} onSelect={() => onSelect(model)} />
          ))}
        </div>
      )}
    </div>
  );
};
