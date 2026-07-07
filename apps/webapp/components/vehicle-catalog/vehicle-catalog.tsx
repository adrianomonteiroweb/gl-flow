'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent } from '@workspace/ui/components/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';

import { useSessionContext } from '@/contexts/session';
import { canAccessSettings } from '@/lib/auth/permissions';
import { deleteVehicleModel, getVehicleModels } from '@/actions/vehicle-catalog';
import { NewNegotiationDialog } from '@/components/leads/new-negotiation-dialog';

import { ConditionTabs, type ConditionFilter } from './condition-tabs';
import { SegmentTabs, type SegmentFilter } from './segment-tabs';
import { VehicleModelCard } from './vehicle-model-card';
import { VehicleModelForm } from './vehicle-model-form';
import type { VehicleModel } from './types';

export const VehicleCatalog = () => {
  const { user } = useSessionContext();
  const canManage = canAccessSettings(user?.role);

  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [condition, setCondition] = useState<ConditionFilter>('all');
  const [segment, setSegment] = useState<SegmentFilter>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleModel | null>(null);
  const [deleting, setDeleting] = useState<VehicleModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [negotiationVehicle, setNegotiationVehicle] = useState<VehicleModel | null>(null);
  const [negotiationOpen, setNegotiationOpen] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getVehicleModels();

      if (result.success) {
        setModels((result.data ?? []) as VehicleModel[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    document.addEventListener('vehicle-models:updated', fetchModels);
    return () => {
      document.removeEventListener('vehicle-models:updated', fetchModels);
    };
  }, [fetchModels]);

  const byCondition = condition === 'all' ? models : models.filter(m => m.condition === condition);
  const filtered = segment === 'all' ? byCondition : byCondition.filter(m => m.segment === segment);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (model: VehicleModel) => {
    setEditing(model);
    setFormOpen(true);
  };

  const startSale = (model: VehicleModel) => {
    setNegotiationVehicle(model);
    setNegotiationOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteVehicleModel(deleting.id);

      if (!result.success) {
        toast.error(result.error ?? 'Erro ao excluir o veículo.');
        return;
      }

      toast.success('Veículo removido do catálogo.');
      setDeleting(null);
      fetchModels();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Catálogo de Veículos</h2>
            <p className="text-sm text-muted-foreground">Modelos disponíveis para negociação</p>
          </div>

          {canManage && (
            <Button type="button" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo veículo</span>
              <span className="sm:hidden">Veículo</span>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <ConditionTabs value={condition} onChange={setCondition} />
        <SegmentTabs value={segment} onChange={setSegment} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          <span>Nenhum veículo cadastrado neste segmento.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map(model => (
            <VehicleModelCard
              key={model.id}
              model={model}
              footer={
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => openEdit(model)}
                  >
                    Detalhes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => startSale(model)}
                  >
                    Vender
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          {formOpen && (
            <VehicleModelForm
              model={editing ?? undefined}
              onSaved={() => {
                setFormOpen(false);
                fetchModels();
              }}
              onCancel={() => setFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `"${deleting.model}" será removido do catálogo. Esta ação pode ser desfeita reativando o cadastro.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={event => { event.preventDefault(); handleDelete(); }} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewNegotiationDialog
        initialVehicle={negotiationVehicle ?? undefined}
        open={negotiationOpen}
        onOpenChange={setNegotiationOpen}
      />
    </div>
  );
};
