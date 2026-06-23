'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Filter, Handshake, Trophy, UserPlus, XCircle } from 'lucide-react';
import { getStepColorClasses } from '@/lib/step-colors';
import { KanbanCard } from './card';

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
  [key: string]: any;
}

interface KanbanColumnProps {
  step: { id: string; label: string; configKey?: string; color?: string | null };
  leads: Lead[];
  loading?: boolean;
  loadedAt: string;
  onUpdated?: () => void;
}

const getStepIcon = (slug: string | undefined, iconClass: string) => {
  const cls = `w-3.5 h-3.5 ${iconClass}`;

  switch (slug) {
    case 'new':
      return <UserPlus className={cls} />;
    case 'qualified':
      return <Filter className={cls} />;
    case 'negotiation':
      return <Handshake className={cls} />;
    case 'closed_won':
      return <Trophy className={cls} />;
    case 'closed_lost':
      return <XCircle className={cls} />;
    default:
      return null;
  }
};

export const KanbanColumn = ({ step, leads, loading, loadedAt, onUpdated }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: step.id,
  });

  const validLeads = (leads || []).filter(lead => {
    if (!lead || !lead.lead || !lead.lead.id) {
      console.warn('Lead com estrutura inválida encontrado e ignorado');
      return false;
    }

    return true;
  });

  const colorClasses = getStepColorClasses(step.color);
  const icon = getStepIcon(step.configKey, colorClasses.iconText);

  return (
    <div
      ref={setNodeRef}
      className={`w-full bg-muted/30 rounded-lg border border-border shadow-sm flex flex-col h-[calc(100vh-140px)] transition-colors ${
        isOver ? 'ring-2 ring-primary/50 bg-primary/5' : ''
      }`}>
      <div className={`px-3 py-2 rounded-t-lg flex-shrink-0 border-b border-border ${colorClasses.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {icon}
            <h3 className="font-semibold text-sm text-foreground">{step.label}</h3>
          </div>

          <span
            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${colorClasses.countBadge}`}>
            {validLeads.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <SortableContext items={validLeads.map(lead => lead.lead.id)} strategy={verticalListSortingStrategy}>
          <div className="p-2 space-y-1.5">
            {validLeads.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-5 border-2 border-dashed border-border/60 rounded-lg">
                Arraste os leads para esta etapa
              </div>
            )}
            {validLeads.map(lead => (
              <KanbanCard key={lead.lead.id} lead={lead} loadedAt={loadedAt} onUpdated={onUpdated} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
