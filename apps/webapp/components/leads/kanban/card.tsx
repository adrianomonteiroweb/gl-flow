'use client';

import type { CSSProperties } from 'react';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@workspace/ui/lib/utils';
import { LeadCardContent, type LeadItem } from '@/components/leads/lead-card-content';
import type { ClosedInfo, KanbanColumn } from '@/utils/kanban-columns';

interface KanbanCardProps {
  lead: LeadItem;
  loadedAt: string;
  columns: KanbanColumn[];
  closedInfo: ClosedInfo | null;
  onUpdated?: () => void;
  onOpenDetails: (item: LeadItem, tab?: string) => void;
  onMoveStage: (item: LeadItem, target: KanbanColumn) => void;
}

export const KanbanCard = ({ lead, loadedAt, columns, closedInfo, onUpdated, onOpenDetails, onMoveStage }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.lead.id });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    ...(isDragging && {
      position: 'fixed',
      zIndex: 999,
      opacity: 0.95,
      transition: 'none',
    }),
  };

  return (
    <LeadCardContent
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      item={lead}
      loadedAt={loadedAt}
      columns={columns}
      closedInfo={closedInfo}
      onUpdated={onUpdated}
      onOpenDetails={onOpenDetails}
      onMoveStage={onMoveStage}
      className={cn('group cursor-grab touch-none active:cursor-grabbing', isDragging && 'shadow-xl ring-2 ring-ring')}
    />
  );
};
