import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';

import type { DashboardStat } from './mock-data';

export const StatCard = ({ stat }: { stat: DashboardStat }) => {
  const Icon = stat.icon;
  const TrendIcon = stat.trend?.direction === 'down' ? ArrowDownRight : ArrowUpRight;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</span>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-muted', stat.accent)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{stat.value}</p>

      {stat.trend && (
        <p className={cn('mt-2 flex items-center gap-1 text-xs font-medium', stat.trend.direction === 'down' ? 'text-red-600' : 'text-emerald-600')}>
          <TrendIcon className="h-3.5 w-3.5" />
          {stat.trend.label}
        </p>
      )}

      {stat.hint && <p className={cn('text-xs text-muted-foreground', stat.trend ? 'mt-1' : 'mt-2')}>{stat.hint}</p>}
    </div>
  );
};
