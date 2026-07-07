'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { getActiveVehicleModels } from '@/actions/vehicle-catalog';

import { ConditionTabs, type ConditionFilter } from './condition-tabs';
import { SegmentTabs, type SegmentFilter } from './segment-tabs';
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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Veículo de Interesse</h3>
        <p className="text-sm text-muted-foreground">Selecione o modelo Honda</p>
      </div>

      <div className="space-y-3">
        <ConditionTabs value={condition} onChange={setCondition} />
        <SegmentTabs value={segment} onChange={setSegment} />
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
        <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
          {filtered.map(model => (
            <VehicleModelCard key={model.id} model={model} selectable selected={model.id === selectedId} onSelect={() => onSelect(model)} />
          ))}
        </div>
      )}
    </div>
  );
};
