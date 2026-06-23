'use client';

import { useState } from 'react';
import { Bot, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@workspace/ui/components/popover';
import { createStatus, updateStatus, updateStepStatusColor, removeStatusFromStage } from '@/actions/pipelines';
import { STATUS_COLOR_OPTIONS, getStatusDotClass } from '@/lib/status-colors';
import { DeleteStatusDialog } from './delete-status-dialog';
import type { PipelineStatus } from './types';

interface StageStatusesProps {
  stepId: string;
  statuses: PipelineStatus[];
  onChanged: () => void;
}

export const StageStatuses = ({ stepId, statuses, onChanged }: StageStatusesProps) => {
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  const [deleteState, setDeleteState] = useState<{ status: PipelineStatus; chatCount: number; isSystem: boolean } | null>(null);

  const handleAdd = async () => {
    const trimmed = addName.trim();
    setAdding(false);
    setAddName('');

    if (!trimmed) {
      return;
    }

    const result = await createStatus(stepId, { name: trimmed });

    if (result.success) {
      onChanged();
    } else {
      toast.error(result.error || 'Erro ao criar status');
    }
  };

  const handleRename = async (status: PipelineStatus) => {
    const trimmed = editName.trim();
    setEditingId(null);

    if (!trimmed || trimmed === status.name) {
      return;
    }

    const result = await updateStatus(status.id, { name: trimmed });

    if (result.success) {
      onChanged();
    } else {
      toast.error(result.error || 'Erro ao renomear status');
    }
  };

  const handleColorChange = async (statusId: string, color: string | null) => {
    setColorPickerId(null);
    const result = await updateStepStatusColor(stepId, statusId, color);

    if (result.success) {
      onChanged();
    } else {
      toast.error(result.error || 'Erro ao atualizar cor');
    }
  };

  const handleRemove = async (status: PipelineStatus) => {
    const result = await removeStatusFromStage(stepId, status.id);

    if (result.success) {
      onChanged();
      return;
    }

    if ('requiresTarget' in result && result.requiresTarget) {
      setDeleteState({ status, chatCount: result.chatCount, isSystem: result.isSystem });
      return;
    }

    toast.error(result.error || 'Erro ao remover status');
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status da etapa</p>

      <div className="flex flex-wrap gap-1.5">
        {statuses.map(status => (
          <span
            key={status.id}
            className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs text-foreground">
            <Popover open={colorPickerId === status.id} onOpenChange={open => setColorPickerId(open ? status.id : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`h-2 w-2 shrink-0 rounded-full transition-transform hover:scale-125 ${getStatusDotClass(status.color)}`}
                  aria-label="Cor do status"
                />
              </PopoverTrigger>

              <PopoverContent className="w-auto p-2" align="start" side="top">
                <p className="mb-1.5 text-[11px] text-muted-foreground">Categoria</p>

                <div className="flex gap-1.5">
                  {STATUS_COLOR_OPTIONS.map(option => (
                    <button
                      key={option.label}
                      type="button"
                      title={option.label}
                      onClick={() => handleColorChange(status.id, option.value)}
                      className={`h-4 w-4 rounded-full border-2 transition-all ${option.dot} ${
                        status.color === option.value
                          ? 'scale-110 border-foreground'
                          : 'border-transparent hover:border-border'
                      }`}
                      aria-label={option.label}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {status.is_system && <Bot className="h-3 w-3 text-muted-foreground" />}

            {editingId === status.id ? (
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => handleRename(status)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleRename(status);
                  }

                  if (e.key === 'Escape') {
                    setEditingId(null);
                  }
                }}
                className="w-24 bg-transparent outline-none"
              />
            ) : (
              <button
                type="button"
                className="cursor-text"
                onDoubleClick={() => {
                  setEditingId(status.id);
                  setEditName(status.name);
                }}>
                {status.name}
              </button>
            )}

            <button
              type="button"
              aria-label="Remover status"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(status)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {adding ? (
          <input
            autoFocus
            value={addName}
            onChange={e => setAddName(e.target.value)}
            onBlur={handleAdd}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleAdd();
              }

              if (e.key === 'Escape') {
                setAdding(false);
                setAddName('');
              }
            }}
            placeholder="Novo status"
            maxLength={255}
            className="w-28 rounded-md border border-dashed bg-transparent px-2 py-1 text-xs outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-primary hover:bg-muted/50">
            <Plus className="h-3 w-3" /> status
          </button>
        )}
      </div>

      <DeleteStatusDialog
        open={!!deleteState}
        onOpenChange={open => {
          if (!open) {
            setDeleteState(null);
          }
        }}
        stepId={stepId}
        status={deleteState?.status ?? null}
        siblingStatuses={statuses.filter(s => s.id !== deleteState?.status.id)}
        chatCount={deleteState?.chatCount ?? 0}
        isSystem={deleteState?.isSystem ?? false}
        onSuccess={() => {
          setDeleteState(null);
          onChanged();
        }}
      />
    </div>
  );
};
