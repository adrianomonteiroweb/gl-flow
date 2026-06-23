'use client';

import { useState, useCallback, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight, Inbox } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Switch } from '@workspace/ui/components/switch';
import { Badge } from '@workspace/ui/components/badge';
import { Label } from '@workspace/ui/components/label';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@workspace/ui/components/dropdown-menu';
import { getLossReasons, reorderLossReasons, updateLossReason, getAllowFreeformLossReasons, toggleFreeformLossReasons } from '@/actions/loss-reasons';
import { LossReasonDialog } from './loss-reason-dialog';
import { DeleteLossReasonDialog } from './delete-loss-reason-dialog';

interface LossReason {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

const SortableItem = ({
  reason,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  reason: LossReason;
  onEdit: (reason: LossReason) => void;
  onDelete: (reason: LossReason) => void;
  onToggleActive: (reason: LossReason) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: reason.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-3 border rounded-lg bg-background group transition-colors ${
        isDragging ? 'opacity-50 shadow-lg' : 'hover:bg-muted/50'
      } ${!reason.is_active ? 'opacity-60' : ''}`}>
      <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="flex-1 text-sm">{reason.name}</span>

      {!reason.is_active && (
        <Badge variant="secondary" className="text-xs">
          Inativo
        </Badge>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(reason)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggleActive(reason)}>
            {reason.is_active ? (
              <>
                <ToggleLeft className="h-4 w-4 mr-2" />
                Desativar
              </>
            ) : (
              <>
                <ToggleRight className="h-4 w-4 mr-2" />
                Ativar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(reason)} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const LossReasonsList = () => {
  const [reasons, setReasons] = useState<LossReason[]>([]);
  const [allowFreeform, setAllowFreeform] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingReason, setEditingReason] = useState<LossReason | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReason, setDeletingReason] = useState<LossReason | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    try {
      const [reasonsResult, freeformResult] = await Promise.all([getLossReasons(), getAllowFreeformLossReasons()]);

      const errorMessage = !reasonsResult.success ? reasonsResult.error : !freeformResult.success ? freeformResult.error : null;

      if (reasonsResult.success) setReasons(reasonsResult.data as LossReason[]);
      if (freeformResult.success) setAllowFreeform(freeformResult.data);
      if (errorMessage) setLoadError(errorMessage);
    } catch (error: any) {
      setLoadError(error?.message || 'Erro ao carregar motivos de perda');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = reasons.findIndex(r => r.id === active.id);
    const newIndex = reasons.findIndex(r => r.id === over.id);
    const reordered = arrayMove(reasons, oldIndex, newIndex);

    setReasons(reordered);

    const items = reordered.map((r, i) => ({ id: r.id, sort_order: i }));
    await reorderLossReasons(items);
  };

  const handleCreate = () => {
    setDialogMode('create');
    setEditingReason(null);
    setDialogOpen(true);
  };

  const handleEdit = (reason: LossReason) => {
    setDialogMode('edit');
    setEditingReason(reason);
    setDialogOpen(true);
  };

  const handleDelete = (reason: LossReason) => {
    setDeletingReason(reason);
    setDeleteDialogOpen(true);
  };

  const handleToggleActive = async (reason: LossReason) => {
    await updateLossReason(reason.id, { is_active: !reason.is_active });
    fetchData();
  };

  const handleToggleFreeform = async (checked: boolean) => {
    setAllowFreeform(checked);
    await toggleFreeformLossReasons(checked);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button onClick={fetchData} variant="outline" size="sm">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Motivos de perda</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie motivos de perda predefinidos. Quando um negócio é marcado como perdido, os usuários podem escolher entre essas opções. Documentar
          o motivo de perda ajuda você a entender melhor seu processo de vendas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Motivos em formato livre</CardTitle>
          <CardDescription>
            Permite que os usuários informem motivos personalizados além desta lista. Desative para padronizar somente as opções cadastradas.
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              <Switch id="freeform-toggle" checked={allowFreeform} onCheckedChange={handleToggleFreeform} />
              <Label htmlFor="freeform-toggle" className="sr-only">
                Permitir motivos em formato livre
              </Label>
            </div>
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de motivos</CardTitle>
          <CardDescription>
            Arraste para reordenar. A ordem definida aqui é a mesma exibida aos usuários no momento de marcar um negócio como perdido.
          </CardDescription>
          <CardAction>
            <Button onClick={handleCreate} size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-1" />
              Motivo da perda
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {reasons.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum motivo de perda cadastrado</p>
              <Button onClick={handleCreate} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar primeiro motivo
              </Button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={reasons.map(r => r.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {reasons.map(reason => (
                    <SortableItem key={reason.id} reason={reason} onEdit={handleEdit} onDelete={handleDelete} onToggleActive={handleToggleActive} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <LossReasonDialog open={dialogOpen} onOpenChange={setDialogOpen} mode={dialogMode} reason={editingReason} onSuccess={fetchData} />

      <DeleteLossReasonDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} reason={deletingReason} onSuccess={fetchData} />
    </div>
  );
};
