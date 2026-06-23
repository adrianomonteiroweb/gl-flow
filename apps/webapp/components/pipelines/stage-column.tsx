'use client';

import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, Trash2 } from 'lucide-react';
import { Badge } from '@workspace/ui/components/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@workspace/ui/components/popover';
import { STEP_COLOR_PALETTE, STEP_COLOR_MAP, getStepColorClasses, type StepColorName } from '@/lib/step-colors';
import { StageStatuses } from './stage-statuses';
import type { PipelineStage } from './types';

interface StageColumnProps {
  stage: PipelineStage;
  onRename: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
  onDelete: (stage: PipelineStage) => void;
  onStatusesChanged: () => void;
}

export const StageColumn = ({ stage, onRename, onColorChange, onDelete, onStatusesChanged }: StageColumnProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const [name, setName] = useState(stage.name);
  const [colorOpen, setColorOpen] = useState(false);

  useEffect(() => {
    setName(stage.name);
  }, [stage.name]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const commitName = () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setName(stage.name);
      return;
    }

    if (trimmed !== stage.name) {
      onRename(stage.id, trimmed);
    }
  };

  const colorClasses = getStepColorClasses(stage.color);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-56 flex-shrink-0 flex-col gap-2.5 rounded-xl border bg-background overflow-hidden ${isDragging ? 'opacity-50 shadow-lg' : ''}`}>
      <div className={`h-1.5 ${colorClasses.dot}`} />

      <div className="flex flex-col gap-2.5 px-3 pb-3">
        <div className="flex items-center gap-1.5">
          <button
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Reordenar etapa"
            {...attributes}
            {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            aria-label="Nome da etapa"
            maxLength={255}
            className="w-full rounded-md border bg-muted/40 px-2 py-1.5 text-sm font-medium outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Popover open={colorOpen} onOpenChange={setColorOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-5 w-5 rounded-full border border-border transition-transform hover:scale-110 ${colorClasses.dot}`}
                aria-label="Cor da etapa"
              />
            </PopoverTrigger>

            <PopoverContent className="w-auto p-2" align="start">
              <p className="mb-2 text-xs text-muted-foreground">Cor da etapa</p>

              <div className="grid grid-cols-6 gap-1.5">
                {STEP_COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      onColorChange(stage.id, color);
                      setColorOpen(false);
                    }}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${STEP_COLOR_MAP[color].dot} ${
                      stage.color === color ? 'scale-110 border-foreground' : 'border-transparent hover:border-border'
                    }`}
                    aria-label={color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {stage.is_system && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Lock className="h-3 w-3" /> Sistema
            </Badge>
          )}

          <span className="text-[11px] text-muted-foreground">{stage.chatCount} leads</span>
        </div>

        <StageStatuses stepId={stage.id} statuses={stage.statuses} onChanged={onStatusesChanged} />

        <button
          type="button"
          onClick={() => onDelete(stage)}
          className="mt-auto flex w-full items-center justify-center gap-1.5 border-t pt-2 text-xs text-destructive hover:text-destructive/80">
          <Trash2 className="h-3.5 w-3.5" /> Excluir etapa
        </button>
      </div>
    </div>
  );
};
