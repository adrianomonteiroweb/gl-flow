'use client';

import { Badge } from '@workspace/ui/components/badge';
import { ArrowRight, MessageSquare, Clock, XCircle, User, Bot, AlertCircle, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AutomationLog = {
  id: string;
  event_type: string;
  from_state: string | null;
  to_state: string | null;
  channel: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const EVENT_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  STATE_TRANSITION: {
    icon: <ArrowRight className="size-4" />,
    label: 'Transição de estado',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    badgeVariant: 'default',
  },
  MESSAGE_SENT: {
    icon: <MessageSquare className="size-4" />,
    label: 'Mensagem enviada',
    color: 'text-green-600 bg-green-50 border-green-200',
    badgeVariant: 'secondary',
  },
  FOLLOWUP_SCHEDULED: {
    icon: <Clock className="size-4" />,
    label: 'Follow-up agendado',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    badgeVariant: 'outline',
  },
  FOLLOWUP_CANCELLED: {
    icon: <XCircle className="size-4" />,
    label: 'Follow-up cancelado',
    color: 'text-red-600 bg-red-50 border-red-200',
    badgeVariant: 'destructive',
  },
  HANDOFF_START: {
    icon: <User className="size-4" />,
    label: 'Atendimento humano iniciado',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    badgeVariant: 'outline',
  },
  HANDOFF_END: {
    icon: <Bot className="size-4" />,
    label: 'Bot retomado',
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    badgeVariant: 'secondary',
  },
  FLOW_ERROR: {
    icon: <AlertCircle className="size-4" />,
    label: 'Erro no fluxo',
    color: 'text-red-700 bg-red-100 border-red-300',
    badgeVariant: 'destructive',
  },
};

const STATE_LABELS: Record<string, string> = {
  AWAITING_NAME: 'Aguardando nome',
  AWAITING_ADDRESS_ZIP: 'Aguardando CEP',
  AWAITING_ADDRESS_STREET: 'Aguardando rua',
  AWAITING_ADDRESS_NUMBER: 'Aguardando número',
  QUALIFIED: 'Qualificado',
  BOT_PAUSED: 'Bot pausado',
  INACTIVE: 'Inativo',
  CLOSED: 'Encerrado',
};

type Props = {
  events: AutomationLog[];
};

export function EventTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <Zap className="size-8 opacity-30" />
        <p className="text-sm">Nenhum evento registrado para este chat.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
      <ol className="space-y-4">
        {events.map((event, idx) => {
          const config = EVENT_CONFIG[event.event_type] ?? {
            icon: <Zap className="size-4" />,
            label: event.event_type,
            color: 'text-muted-foreground bg-muted border-border',
            badgeVariant: 'outline' as const,
          };

          return (
            <li key={event.id ?? idx} className="flex gap-4 items-start relative">
              <div className={`relative z-10 flex items-center justify-center size-10 rounded-full border ${config.color} flex-shrink-0`}>
                {config.icon}
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{config.label}</span>
                  {event.from_state && event.to_state && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                        {STATE_LABELS[event.from_state] ?? event.from_state}
                      </span>
                      <ArrowRight className="size-3" />
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                        {STATE_LABELS[event.to_state] ?? event.to_state}
                      </span>
                    </span>
                  )}
                  {event.channel && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {event.channel}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
