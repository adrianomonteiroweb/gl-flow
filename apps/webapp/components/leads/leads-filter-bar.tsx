'use client';

import { useEffect, useState } from 'react';
import { Toggle } from '@workspace/ui/components/toggle';
import { cn } from '@workspace/ui/lib/utils';
import { useSearchParams } from '@/hooks/use-search-params';
import { getSteps } from '@/actions/steps';

interface FilterChip {
  value: string;
  label: string;
  dotClass: string;
  activeClass: string;
}

const TASK_ALERT_FILTERS: FilterChip[] = [
  {
    value: 'overdue',
    label: 'Vencidas',
    dotClass: 'bg-red-500',
    activeClass: 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-700',
  },
  {
    value: 'near',
    label: 'Vence hoje',
    dotClass: 'bg-amber-500',
    activeClass: 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-700',
  },
  {
    value: 'upcoming',
    label: 'Próximas',
    dotClass: 'bg-gray-500',
    activeClass: 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-700',
  },
  {
    value: 'none',
    label: 'Sem tarefa',
    dotClass: 'bg-slate-400',
    activeClass: 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-700',
  },
];

const parseCSV = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  return String(value).split(',').filter(Boolean);
};

const toggleValue = (current: string[], value: string): string => {
  const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];

  return next.join(',');
};

export const LeadsFilterBar = ({ children }: { children?: React.ReactNode }) => {
  const { params, setParams } = useSearchParams();
  const [stepFilters, setStepFilters] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getSteps();
      if (active && result.success && result.data) {
        const chips = (result.data as any[]).filter(s => s.slug !== 'closed').map(s => ({ value: s.id as string, label: s.name as string }));
        setStepFilters(chips);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const activeTaskAlerts = parseCSV(params.taskAlerts);
  const activeSteps = parseCSV(params.steps);

  const handleTaskAlertToggle = (value: string) => {
    const next = toggleValue(activeTaskAlerts, value);
    setParams({ taskAlerts: next || undefined });
  };

  const handleStepToggle = (value: string) => {
    const next = toggleValue(activeSteps, value);

    setParams({ steps: next || undefined });
  };

  const inactiveClass = 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground';
  const activeStepClass = 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/15 hover:text-primary';

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4 md:flex-wrap">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
        <span className="text-xs font-medium text-muted-foreground mr-0.5">Tarefas</span>

        {TASK_ALERT_FILTERS.map(chip => {
          const isActive = activeTaskAlerts.includes(chip.value);

          return (
            <Toggle
              key={chip.value}
              size="sm"
              variant="outline"
              pressed={isActive}
              onPressedChange={() => handleTaskAlertToggle(chip.value)}
              className={cn(
                'gap-1.5 rounded-full px-3 h-7 text-xs font-medium border transition-colors',
                isActive ? chip.activeClass : inactiveClass
              )}>
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', chip.dotClass)} />
              {chip.label}
            </Toggle>
          );
        })}
      </div>

      {stepFilters.length > 0 && (
        <>
          <div className="hidden md:block w-px h-5 bg-border" />

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            <span className="text-xs font-medium text-muted-foreground mr-0.5">Etapas</span>

            {stepFilters.map(chip => {
              const isActive = activeSteps.includes(chip.value);

              return (
                <Toggle
                  key={chip.value}
                  size="sm"
                  variant="outline"
                  pressed={isActive}
                  onPressedChange={() => handleStepToggle(chip.value)}
                  className={cn(
                    'gap-1.5 rounded-full px-3 h-7 text-xs font-medium border transition-colors',
                    isActive ? activeStepClass : inactiveClass
                  )}>
                  {chip.label}
                </Toggle>
              );
            })}
          </div>
        </>
      )}

      {children && (
        <>
          <div className="hidden md:block w-px h-5 bg-border" />
          <div className="flex items-center gap-1.5">{children}</div>
        </>
      )}
    </div>
  );
};
