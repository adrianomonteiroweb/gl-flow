'use client';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { StageColumn } from './stage-column';
import type { PipelineStage } from './types';

interface StageBoardProps {
  stages: PipelineStage[];
  onReorder: (stages: PipelineStage[]) => void;
  onAddStage: () => void;
  onRenameStage: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
  onDeleteStage: (stage: PipelineStage) => void;
  onStatusesChanged: () => void;
}

export const StageBoard = ({ stages, onReorder, onAddStage, onRenameStage, onColorChange, onDeleteStage, onStatusesChanged }: StageBoardProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex(s => s.id === active.id);
    const newIndex = stages.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(stages, oldIndex, newIndex));
  };

  return (
    <div className="overflow-x-auto pb-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex min-w-min items-stretch gap-3">
            {stages.map(stage => (
              <StageColumn
                key={stage.id}
                stage={stage}
                onRename={onRenameStage}
                onColorChange={onColorChange}
                onDelete={onDeleteStage}
                onStatusesChanged={onStatusesChanged}
              />
            ))}

            <button
              type="button"
              onClick={onAddStage}
              className="flex w-40 flex-shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-primary hover:bg-muted/50">
              <Plus className="h-5 w-5" /> Adicionar etapa
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
