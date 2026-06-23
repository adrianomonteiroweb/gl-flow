import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';

import { PIPELINE_PREVIEW, type PipelineBadgeTone } from './mock-data';

const badgeToneClass: Record<PipelineBadgeTone, string> = {
  sky: 'bg-sky-500/10 text-sky-600',
  amber: 'bg-amber-500/10 text-amber-600',
  violet: 'bg-violet-500/10 text-violet-600',
  emerald: 'bg-emerald-500/10 text-emerald-600',
  slate: 'bg-muted text-muted-foreground',
};

export const PipelinePreview = () => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Pipeline de vendas</h2>
        <Link
          href="/pipelines"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          Ver tudo
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {PIPELINE_PREVIEW.map(column => (
          <div key={column.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{column.title}</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                {column.items.length}
              </span>
            </div>

            <div className="space-y-2">
              {column.items.map(item => (
                <div key={item.id} className="rounded-lg border border-border bg-background p-3 transition-colors hover:border-border/60">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.model}</p>
                  {item.value && <p className="mt-1.5 text-sm font-semibold text-foreground">{item.value}</p>}
                  <span
                    className={cn(
                      'mt-2 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      badgeToneClass[item.badgeTone]
                    )}>
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
