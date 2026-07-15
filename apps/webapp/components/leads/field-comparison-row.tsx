import { AlertTriangle, Check, Info } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';

import { getToneClasses } from '@/lib/tone-colors';
import type { FieldComparison, FieldMatchStatus } from './field-comparison';

const STATUS_CONFIG: Record<FieldMatchStatus, { icon: typeof Check; tone_key: 'success' | 'warning' | 'info' | 'neutral'; sr_label: string }> = {
  match: { icon: Check, tone_key: 'success', sr_label: 'dados iguais' },
  divergent: { icon: AlertTriangle, tone_key: 'warning', sr_label: 'dados divergentes' },
  new_only: { icon: Info, tone_key: 'info', sr_label: 'apenas no novo lead' },
  existing_only: { icon: Info, tone_key: 'neutral', sr_label: 'apenas no cadastro existente' },
};

interface FieldComparisonRowProps {
  comparison: FieldComparison;
  format_value?: (value: string) => string;
}

export const FieldComparisonRow = ({ comparison, format_value }: FieldComparisonRowProps) => {
  const { label, status, new_value, existing_value } = comparison;
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const tone = getToneClasses(config.tone_key);

  const display = (value: string | null) => {
    if (!value) {
      return <span className="text-xs italic text-muted-foreground">Sem dados</span>;
    }

    return format_value ? format_value(value) : value;
  };

  const aria_label = `Campo ${label}: novo '${new_value ?? 'sem dados'}', existente '${existing_value ?? 'sem dados'}', ${config.sr_label}`;

  return (
    <div
      className={cn('grid grid-cols-[auto_1fr_1fr] items-center gap-3 rounded-md px-3 py-2', status === 'divergent' && tone.soft)}
      role="row"
      aria-label={aria_label}
    >
      <div className="flex items-center gap-2" role="cell">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>

      <div className={cn('text-sm', status === 'divergent' ? 'font-medium text-foreground' : 'text-muted-foreground')} role="cell">
        {display(new_value)}
      </div>

      <div className={cn('text-sm', status === 'existing_only' ? 'text-foreground' : 'text-muted-foreground')} role="cell">
        {display(existing_value)}
      </div>
    </div>
  );
};
