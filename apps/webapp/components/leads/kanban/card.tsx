'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import { DateFormatter } from '@workspace/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { getStatusLabel } from '@/utils/status-utils';
import { getLeadTaskAlert, leadTaskAlertConfig, type LeadTaskAlertIcon } from '@/utils/task-status';
import { LeadAssigneeControl } from '@/components/leads/assignee-control';
import { Phone, ChevronLeft, ChevronDown, ChevronRight, Check, type LucideIcon } from 'lucide-react';

const alertIconMap: Record<LeadTaskAlertIcon, LucideIcon> = {
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  check: Check,
};

interface Lead {
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

interface KanbanCardProps {
  lead: Lead;
  loadedAt: string;
  onUpdated?: () => void;
}

export const KanbanCard = ({ lead, loadedAt, onUpdated }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.lead.id,
  });
  const router = useRouter();

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    ...(isDragging && {
      position: 'fixed',
      zIndex: 999,
      opacity: 0.95,
      transition: 'none',
    }),
  };

  const handleClick = () => {
    try {
      const chatId = lead.chat?.id;
      if (!chatId) {
        console.warn('Chat ID não encontrado para o lead:', lead.lead.id);
        return;
      }
      sessionStorage.setItem(`leads-read-${chatId}`, new Date().toISOString());
      router.push(`/chats/${chatId}`);
    } catch (error) {
      console.error('Erro ao navegar para chat:', error);
    }
  };

  if (!lead?.lead?.id) {
    return null;
  }

  const statusLabel = lead.chat?.status_name || getStatusLabel(lead.chat?.status || 'pending');
  const assignee = lead.assignee;
  const leadName = lead.lead?.name || 'Sem nome';
  const leadPhone = lead.lead?.phone;
  const taskAlert = getLeadTaskAlert(lead.tasks ?? []);
  const taskAlertConfig = taskAlert ? leadTaskAlertConfig[taskAlert] : null;
  const readAt = lead.chat?.id ? sessionStorage.getItem(`leads-read-${lead.chat.id}`) : null;
  const compareAt = readAt || loadedAt;
  const hasNewActivity =
    !!compareAt &&
    !!lead.chat?.updated_at &&
    new Date(lead.chat.updated_at) > new Date(compareAt);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`relative p-3 bg-card rounded-md border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-grab active:cursor-grabbing group ${
        isDragging ? 'opacity-90 ring-2 ring-ring shadow-xl scale-105' : ''
      }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {hasNewActivity && (
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          )}
          <p className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors min-w-0">
            {leadName}
          </p>
        </div>

        {taskAlertConfig && (() => {
          const Icon = alertIconMap[taskAlertConfig.icon];
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 cursor-pointer ${taskAlertConfig.circleClass}`}
                  aria-label={taskAlertConfig.label}
                  onClick={e => {
                    e.stopPropagation();
                    const chatId = lead.chat?.id;
                    if (chatId) {
                      sessionStorage.setItem(`leads-read-${chatId}`, new Date().toISOString());
                      router.push(`/chats/${chatId}?tab=tasks`);
                    }
                  }}
                >
                  <Icon className="w-4 h-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">{taskAlertConfig.label}</TooltipContent>
            </Tooltip>
          );
        })()}
      </div>

      <p className="flex items-center text-xs text-muted-foreground mb-2.5 truncate">
        <Phone className="inline-block mr-1.5 w-3.5 h-3.5 flex-shrink-0" />
        {leadPhone}
      </p>

      <div className="border-t border-border mb-2.5" />

      {/* Responsável: assumir / liberar / atribuir (linha própria para caber no card).
          stopPropagation: interagir com o responsável não deve arrastar o card nem navegar. */}
      <div
        className="mb-2.5 flex"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}>
        <LeadAssigneeControl leadId={lead.lead.id} assignee={assignee ?? null} onUpdated={onUpdated} />
      </div>

      {/* Rodapé: status + data de atualização */}
      <div className="flex items-center justify-between gap-2">
        <span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap bg-muted text-muted-foreground flex-shrink-0">
          {statusLabel}
        </span>
        <span className="text-[11px] text-muted-foreground truncate">
          {lead.chat?.updated_at ? DateFormatter.dateTime(lead.chat.updated_at) : '—'}
        </span>
      </div>
    </div>
  );
};
