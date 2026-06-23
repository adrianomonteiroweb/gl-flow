'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  Pencil,
  MapPin,
  XCircle,
  RotateCcw,
  RefreshCw,
  ListChecks,
  UserCog,
  UserCheck,
  Trophy,
  Lock,
  ClipboardList,
  CheckCircle2,
  Trash2,
  FileText,
  MessageSquare,
  History,
  Send,
  Loader2,
  Maximize2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Textarea } from '@workspace/ui/components/textarea';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { cn } from '@workspace/ui/lib/utils';
import { DateFormatter } from '@workspace/utils';
import { getLeadActivities, addLeadNote, type LeadActivity } from '@/actions/lead-activities';
import { getStepLabel, getStatusLabel } from '@/utils/status-utils';
import { getRoleLabel } from '@/lib/auth/permissions';

// ─── Config ──────────────────────────────────────────────────────────────────

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'muted';

const toneStyles: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-green-50 text-green-600 border-green-200',
  warning: 'bg-amber-50 text-amber-600 border-amber-200',
  danger: 'bg-red-50 text-red-600 border-red-200',
  muted: 'bg-muted text-muted-foreground border-border',
};

const ACTIVITY_CONFIG: Record<LeadActivity['type'], { icon: LucideIcon; label: string; tone: Tone }> = {
  lead_created: { icon: UserPlus, label: 'Lead criado', tone: 'primary' },
  info_updated: { icon: Pencil, label: 'Informações atualizadas', tone: 'muted' },
  address_updated: { icon: MapPin, label: 'Endereço atualizado', tone: 'muted' },
  loss_reason_set: { icon: XCircle, label: 'Motivo de perda definido', tone: 'danger' },
  loss_reason_cleared: { icon: RotateCcw, label: 'Motivo de perda removido', tone: 'muted' },
  status_changed: { icon: RefreshCw, label: 'Status alterado', tone: 'primary' },
  step_changed: { icon: ListChecks, label: 'Etapa alterada', tone: 'primary' },
  assignee_changed: { icon: UserCog, label: 'Responsável alterado', tone: 'primary' },
  lead_taken: { icon: UserCheck, label: 'Lead assumido', tone: 'success' },
  lead_reactivated: { icon: RotateCcw, label: 'Cliente reativado', tone: 'success' },
  lead_won: { icon: Trophy, label: 'Negociação ganha', tone: 'success' },
  lead_closed: { icon: Lock, label: 'Negociação perdida', tone: 'danger' },
  chat_won: { icon: Trophy, label: 'Negociação ganha', tone: 'success' },
  chat_closed: { icon: Lock, label: 'Atendimento encerrado', tone: 'muted' },
  task_created: { icon: ClipboardList, label: 'Tarefa criada', tone: 'primary' },
  task_completed: { icon: CheckCircle2, label: 'Tarefa concluída', tone: 'success' },
  task_reopened: { icon: RotateCcw, label: 'Tarefa reaberta', tone: 'warning' },
  task_deleted: { icon: Trash2, label: 'Tarefa removida', tone: 'muted' },
  proposal_created: { icon: FileText, label: 'Proposta criada', tone: 'primary' },
  note_added: { icon: MessageSquare, label: 'Nota', tone: 'muted' },
};

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'via WhatsApp',
  telegram: 'via Telegram',
  manual: 'cadastro manual',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'nome',
  email: 'e-mail',
  phone: 'telefone',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getString = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

const renderTitle = (activity: LeadActivity): string => {
  const config = ACTIVITY_CONFIG[activity.type];

  // Self-assign shows who took it by role, e.g. "Assumido por usuário SDR".
  if (activity.type === 'lead_taken') {
    const role = getString(activity.metadata?.role);
    return role ? `Assumido por usuário ${getRoleLabel(role)}` : config.label;
  }

  return config.label;
};

const renderDetail = (activity: LeadActivity): string | null => {
  const meta = activity.metadata ?? {};

  switch (activity.type) {
    case 'lead_created':
    case 'lead_reactivated': {
      const origin = getString(meta.origin);
      return origin ? (ORIGIN_LABELS[origin] ?? origin) : null;
    }
    case 'info_updated': {
      const fields = Array.isArray(meta.fields) ? (meta.fields as string[]) : [];
      if (!fields.length) return null;
      return fields.map(f => FIELD_LABELS[f] ?? f).join(', ');
    }
    case 'loss_reason_set':
      return getString(meta.lossReason);
    case 'status_changed': {
      const from = getString(meta.from);
      const to = getString(meta.to);
      const fromLabel = getString(meta.from_label) || (from ? getStatusLabel(from) : '');
      const toLabel = getString(meta.to_label) || (to ? getStatusLabel(to) : '');
      if (fromLabel && toLabel) return `${fromLabel} → ${toLabel}`;
      return toLabel || null;
    }
    case 'step_changed': {
      const from = getString(meta.from);
      const to = getString(meta.to);
      const fromLabel = getString(meta.from_label) || (from ? getStepLabel(from) : '');
      const toLabel = getString(meta.to_label) || (to ? getStepLabel(to) : '');
      if (fromLabel && toLabel) return `${fromLabel} → ${toLabel}`;
      return toLabel || null;
    }
    case 'task_created':
    case 'task_completed':
    case 'task_reopened':
    case 'task_deleted':
    case 'proposal_created':
      return getString(meta.title);
    case 'note_added':
      return activity.description;
    default:
      return null;
  }
};

type DayGroup = { day: string; items: LeadActivity[] };

const groupByDay = (activities: LeadActivity[]): DayGroup[] => {
  const groups: DayGroup[] = [];

  for (const activity of activities) {
    const day = DateFormatter.date(activity.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.items.push(activity);
    } else {
      groups.push({ day, items: [activity] });
    }
  }

  return groups;
};

// ─── Timeline renderer (reused inline + inside dialog) ───────────────────────

const ActivityTimeline = ({ groups }: { groups: DayGroup[] }) => (
  <div className="space-y-5">
    {groups.map(group => (
      <div key={group.day} className="space-y-3">
        <h4 className="sticky top-0 z-10 bg-white py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-background">
          {group.day}
        </h4>

        <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {group.items.map(activity => {
            const config = ACTIVITY_CONFIG[activity.type];
            const Icon = config.icon;
            const detail = renderDetail(activity);

            return (
              <li key={activity.id} className="relative flex items-start gap-3">
                <span
                  className={cn('relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border', toneStyles[config.tone])}>
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{renderTitle(activity)}</p>
                  {detail && (
                    <p
                      className={cn(
                        'mt-0.5 break-words text-sm text-gray-600 dark:text-gray-300',
                        activity.type === 'note_added' && 'whitespace-pre-wrap'
                      )}>
                      {detail}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {DateFormatter.time(activity.created_at)}
                    {activity.actor_name ? ` · ${activity.actor_name}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    ))}
  </div>
);

// ─── Add note form ───────────────────────────────────────────────────────────

const NoteForm = ({ onNoteAdded, leadId }: { onNoteAdded: () => void; leadId: string }) => {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddNote = async () => {
    const text = note.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    setError(null);

    const result = await addLeadNote(leadId, text);

    if (result.success) {
      setNote('');
      onNoteAdded();
    } else {
      setError(result.error);
    }

    setSubmitting(false);
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Adicionar uma nota ao histórico..."
        rows={2}
        className="resize-none text-sm"
        maxLength={1000}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAddNote} disabled={!note.trim() || submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Adicionar nota
        </Button>
      </div>
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

interface LeadTimelineSectionProps {
  leadId: string;
  chatId?: string;
}

export const LeadTimelineSection = ({ leadId }: LeadTimelineSectionProps) => {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!leadId) return;
    const result = await getLeadActivities(leadId);
    if (result.success) {
      setActivities(result.data);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const groups = useMemo(() => groupByDay(activities), [activities]);

  const hasActivities = activities.length > 0;

  return (
    <div className="mt-6 space-y-4">
      <NoteForm leadId={leadId} onNoteAdded={fetchActivities} />

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !hasActivities ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <History className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhuma atividade registrada ainda.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Histórico</h4>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground">
                  <Maximize2 className="h-3.5 w-3.5" />
                  Ampliar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <History className="h-5 w-5 text-primary" />
                    Histórico do Lead
                  </DialogTitle>
                </DialogHeader>
                <div className="shrink-0 px-6 pt-4 pb-2">
                  <NoteForm leadId={leadId} onNoteAdded={fetchActivities} />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
                  <ActivityTimeline groups={groups} />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[400px]">
            <ActivityTimeline groups={groups} />
          </ScrollArea>
        </>
      )}
    </div>
  );
};
