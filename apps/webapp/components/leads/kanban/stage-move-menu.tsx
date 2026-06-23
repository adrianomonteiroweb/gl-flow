'use client';

import type { ReactNode } from 'react';
import { Check, Lock } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { cn } from '@workspace/ui/lib/utils';
import { getStepColorClasses } from '@/lib/step-colors';
import type { KanbanColumn } from '@/utils/kanban-columns';

interface StageMoveMenuProps {
  columns: KanbanColumn[];
  currentColumnId?: string;
  canEditPostSale: boolean;
  onSelect: (target: KanbanColumn) => void;
  trigger: ReactNode;
  align?: 'start' | 'end' | 'center';
}

export const StageMoveMenu = ({ columns, currentColumnId, canEditPostSale, onSelect, trigger, align = 'start' }: StageMoveMenuProps) => {
  if (columns.length === 0) {
    return <>{trigger}</>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>Mover para etapa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map(column => {
          const isCurrent = column.id === currentColumnId;
          const isBlocked = column.isPostSale && !canEditPostSale;

          return (
            <DropdownMenuItem
              key={column.id}
              disabled={isCurrent || isBlocked}
              onSelect={() => onSelect(column)}
              className={cn('gap-2', isCurrent && 'font-medium')}>
              <span className={cn('size-2.5 shrink-0 rounded-full', getStepColorClasses(column.color).dot)} aria-hidden="true" />
              <span className="flex-1 truncate">{column.label}</span>
              {isCurrent && <Check className="size-4 text-primary" aria-hidden="true" />}
              {!isCurrent && isBlocked && <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
