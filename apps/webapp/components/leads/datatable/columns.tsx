'use client';

import { ChevronLeft, ChevronDown, ChevronRight, Check, CircleDot, ListChecks, type LucideIcon } from 'lucide-react';

import { DateFormatter } from '@workspace/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { getStatusLabel, getStepLabel } from '@/utils/status-utils';
import { getLeadTaskAlert, leadTaskAlertConfig, type LeadTaskAlertIcon } from '@/utils/task-status';

const alertIconMap: Record<LeadTaskAlertIcon, LucideIcon> = {
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  check: Check,
};

export const createColumns = (loadedAt: string, onOpenTasks?: (row: any) => void): any[] => [
  {
    accessorKey: 'name',
    header: <span className="font-bold">Nome</span>,
    cell: ({ row }: any) => {
      const chatId = row.original.chat?.id;
      const readAt = chatId ? sessionStorage.getItem(`leads-read-${chatId}`) : null;
      const compareAt = readAt || loadedAt;
      const hasNewActivity = !!compareAt && !!row.original.chat?.updated_at && new Date(row.original.chat.updated_at) > new Date(compareAt);
      const taskAlert = getLeadTaskAlert(row.original.tasks ?? []);
      const taskAlertConfig = taskAlert ? leadTaskAlertConfig[taskAlert] : null;
      return (
        <div className="flex items-center gap-2">
          {hasNewActivity && <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 flex-shrink-0" />}
          <span className="flex-1">{row.original.lead?.name || '—'}</span>
          {taskAlertConfig &&
            (() => {
              const Icon = alertIconMap[taskAlertConfig.icon];
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${taskAlertConfig.circleClass}`}
                      aria-label={taskAlertConfig.label}
                      onClick={e => {
                        e.stopPropagation();
                        onOpenTasks?.(row.original);
                      }}>
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{taskAlertConfig.label}</TooltipContent>
                </Tooltip>
              );
            })()}
        </div>
      );
    },
  },
  {
    accessorKey: 'step',
    header: <span className="font-bold">Etapa</span>,
    meta: { cardLabel: 'Etapa' },
    cell: ({ row }: any) => {
      const stepLabel = row.original.chat?.step_name || getStepLabel(row.original.chat?.step || 'new');
      return (
        <span className="inline-flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span>{stepLabel}</span>
        </span>
      );
    },
  },
  {
    accessorKey: 'assignee',
    header: <span className="font-bold">Responsável</span>,
    meta: { cardLabel: 'Responsável' },
    cell: ({ row }: any) => {
      const assignee = row.original.assignee;
      return (
        <div className="flex items-center gap-2">
          {assignee ? (
            <>
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                {assignee.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-sm">{assignee.name}</span>
            </>
          ) : (
            <span className="text-center text-sm text-muted-foreground">-</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: <span className="font-bold">Status</span>,
    cell: ({ row }: any) => {
      const statusLabel = row.original.chat?.status_name || getStatusLabel(row.original.chat?.status || 'em_atendimento');
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
          {statusLabel}
        </span>
      );
    },
  },
  {
    accessorKey: 'updated_at',
    header: <span className="font-bold">Atualizado em</span>,
    meta: { cardLabel: 'Atualizado em' },
    cell: ({ row }: any) => DateFormatter.dateTime(row.original.chat?.updated_at || row.original.lead?.updated_at),
  },
];

export const columns = createColumns('');
