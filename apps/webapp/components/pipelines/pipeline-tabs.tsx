'use client';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Star, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@workspace/ui/components/dropdown-menu';
import type { Pipeline } from './types';

interface PipelineTabsProps {
  pipelines: Pipeline[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (pipelines: Pipeline[]) => void;
  onCreate: () => void;
  onRename: (pipeline: Pipeline) => void;
  onDelete: (pipeline: Pipeline) => void;
}

const SortableTab = ({
  pipeline,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  pipeline: Pipeline;
  active: boolean;
  onSelect: (id: string) => void;
  onRename: (pipeline: Pipeline) => void;
  onDelete: (pipeline: Pipeline) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pipeline.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(pipeline.id)}
      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
        active ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
      } ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}>
      {pipeline.is_default && <Star className="h-3.5 w-3.5" />}
      <span>{pipeline.name}</span>

      {active && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Opções do pipeline"
              className="rounded p-0.5 hover:bg-muted"
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onRename(pipeline)}>
              <Pencil className="mr-2 h-4 w-4" /> Renomear
            </DropdownMenuItem>
            {!pipeline.is_default && (
              <DropdownMenuItem onClick={() => onDelete(pipeline)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export const PipelineTabs = ({ pipelines, selectedId, onSelect, onReorder, onCreate, onRename, onDelete }: PipelineTabsProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pipelines.findIndex(p => p.id === active.id);
    const newIndex = pipelines.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(pipelines, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pipelines.map(p => p.id)} strategy={horizontalListSortingStrategy}>
          {pipelines.map(pipeline => (
            <SortableTab
              key={pipeline.id}
              pipeline={pipeline}
              active={pipeline.id === selectedId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-primary hover:bg-muted/50">
        <Plus className="h-4 w-4" /> Novo pipeline
      </button>
    </div>
  );
};
