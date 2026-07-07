import type { ReactNode } from 'react';

import { cn } from '@workspace/ui/lib/utils';

export interface SummaryRow {
  label: string;
  value: ReactNode;
  strong?: boolean;
}

interface ProposalSummaryProps {
  title: string;
  rows: SummaryRow[];
  total?: SummaryRow;
  className?: string;
}

export const ProposalSummary = ({ title, rows, total, className }: ProposalSummaryProps) => (
  <div className={cn('rounded-xl border border-border bg-muted/30 p-4', className)}>
    <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>
    <dl className="space-y-2">
      {rows.map(row => (
        <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className={cn('text-right', row.strong ? 'font-semibold text-foreground' : 'text-foreground')}>{row.value}</dd>
        </div>
      ))}
    </dl>
    {total && (
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm font-semibold text-foreground">{total.label}</span>
        <span className="text-base font-bold text-foreground">{total.value}</span>
      </div>
    )}
  </div>
);
