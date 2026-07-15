'use client';

import { forwardRef, type HTMLAttributes, type MouseEvent, type PointerEvent } from 'react';
import { ArrowLeftRight, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, Phone, type LucideIcon } from 'lucide-react';

import { DateFormatter } from '@workspace/utils';
import { Button } from '@workspace/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { cn } from '@workspace/ui/lib/utils';
import { useSessionContext } from '@/contexts/session';
import { canEditPostSaleStages } from '@/lib/auth/permissions';
import { getStatusLabel } from '@/utils/status-utils';
import { getLeadTaskAlert, leadTaskAlertConfig, type LeadTaskAlertIcon } from '@/utils/task-status';
import { LeadAssigneeControl } from '@/components/leads/assignee-control';
import { StageMoveMenu } from '@/components/leads/kanban/stage-move-menu';
import { resolveLeadColumnId, type ClosedInfo, type KanbanColumn } from '@/utils/kanban-columns';

const alertIconMap: Record<LeadTaskAlertIcon, LucideIcon> = {
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  check: Check,
};

export interface LeadItem {
  lead: {
    id: string;
    name: string;
    phone: string;
    [key: string]: any;
  };
  chat?: {
    id: string;
    step?: string;
    status?: string;
    status_name?: string;
    assignee_id?: string;
    updated_at?: string;
    [key: string]: any;
  };
  assignee?: {
    id: string;
    name: string;
    [key: string]: any;
  };
  tasks?: { due_date: string; completed_at: string | null }[];
  [key: string]: any;
}

interface LeadCardContentProps extends HTMLAttributes<HTMLDivElement> {
  item: LeadItem;
  loadedAt: string;
  onOpenDetails: (item: LeadItem, tab?: string) => void;
  onUpdated?: () => void;
  columns?: KanbanColumn[];
  closedInfo?: ClosedInfo | null;
  onMoveStage?: (item: LeadItem, target: KanbanColumn) => void;
}

const stop = (event: MouseEvent | PointerEvent) => {
  event.stopPropagation();
};

export const LeadCardContent = forwardRef<HTMLDivElement, LeadCardContentProps>(
  ({ item, loadedAt, onOpenDetails, onUpdated, columns, closedInfo, onMoveStage, className, ...rest }, ref) => {
    const { user } = useSessionContext();

    const leadName = item.lead?.name || 'Sem nome';
    const leadPhone = item.lead?.phone;
    const statusLabel = item.chat?.status_name || getStatusLabel(item.chat?.status || 'pending');

    const readAt = item.chat?.id ? sessionStorage.getItem(`leads-read-${item.chat.id}`) : null;
    const compareAt = readAt || loadedAt;
    const hasNewActivity = !!compareAt && !!item.chat?.updated_at && new Date(item.chat.updated_at) > new Date(compareAt);

    const taskAlert = getLeadTaskAlert(item.tasks ?? []);
    const taskAlertConfig = taskAlert ? leadTaskAlertConfig[taskAlert] : null;

    const canEditPostSale = canEditPostSaleStages(user?.role);
    const showMoveMenu = !!onMoveStage && !!columns && columns.length > 0;
    const currentColumnId = showMoveMenu ? resolveLeadColumnId(item.chat?.step, item.chat?.status, closedInfo ?? null) : undefined;

    return (
      <div
        ref={ref}
        onClick={() => onOpenDetails(item)}
        className={cn('relative rounded-md border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/20 hover:shadow-md', className)}
        {...rest}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {hasNewActivity && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />}
            <p className="line-clamp-1 min-w-0 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{leadName}</p>
          </div>

          {taskAlertConfig &&
            (() => {
              const Icon = alertIconMap[taskAlertConfig.icon];

              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full', taskAlertConfig.circleClass)}
                      aria-label={taskAlertConfig.label}
                      onPointerDown={stop}
                      onClick={event => {
                        stop(event);
                        onOpenDetails(item, 'tasks');
                      }}>
                      <Icon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{taskAlertConfig.label}</TooltipContent>
                </Tooltip>
              );
            })()}
        </div>

        <p className="mb-2.5 flex items-center truncate text-xs text-muted-foreground">
          <Phone className="mr-1.5 inline-block h-3.5 w-3.5 flex-shrink-0" />
          {leadPhone}
        </p>

        <div className="mb-2.5 border-t border-border" />

        <div className="mb-2.5 flex" onClick={stop} onPointerDown={stop}>
          <LeadAssigneeControl leadId={item.lead.id} assignee={item.assignee ?? null} onUpdated={onUpdated} />
        </div>

        <div className="flex items-center gap-2" onClick={stop} onPointerDown={stop}>
          {showMoveMenu && (
            <StageMoveMenu
              columns={columns}
              currentColumnId={currentColumnId}
              canEditPostSale={canEditPostSale}
              onSelect={target => onMoveStage?.(item, target)}
              trigger={
                <Button type="button" variant="outline" size="sm" className="h-8 flex-1 gap-1.5 text-xs">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Mover
                </Button>
              }
            />
          )}

          <Button
            type="button"
            variant={showMoveMenu ? 'ghost' : 'outline'}
            size="sm"
            className="h-8 flex-1 gap-1.5 text-xs"
            onClick={event => {
              stop(event);
              onOpenDetails(item);
            }}>
            <Eye className="h-3.5 w-3.5" />
            Detalhes
          </Button>
        </div>
      </div>
    );
  }
);

LeadCardContent.displayName = 'LeadCardContent';
