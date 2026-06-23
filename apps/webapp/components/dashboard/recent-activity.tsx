import { cn } from '@workspace/ui/lib/utils';

import { RECENT_ACTIVITY, type ActivityTone } from './mock-data';

const dotToneClass: Record<ActivityTone, string> = {
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  red: 'bg-primary',
  violet: 'bg-violet-500',
};

export const RecentActivity = () => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Atividade recente</h2>
      </div>

      <ul className="divide-y divide-border">
        {RECENT_ACTIVITY.map(item => (
          <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotToneClass[item.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{item.name}</span> <span className="text-muted-foreground">— {item.text}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
