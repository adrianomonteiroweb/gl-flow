'use client';

import { useEffect, useState } from 'react';
import { Toggle } from '@workspace/ui/components/toggle';
import { cn } from '@workspace/ui/lib/utils';
import { useSearchParams } from '@/hooks/use-search-params';
import { getSteps } from '@/actions/steps';
import { getToneClasses, type ToneName } from '@/lib/tone-colors';

interface FilterChip {
  value: string;
  label: string;
  tone: ToneName;
}

const TASK_ALERT_FILTERS: FilterChip[] = [
  { value: 'overdue', label: 'Vencidas', tone: 'danger' },
  { value: 'near', label: 'Vence hoje', tone: 'warning' },
  { value: 'upcoming', label: 'Próximas', tone: 'neutral' },
  { value: 'none', label: 'Sem tarefa', tone: 'neutral' },
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
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4 lg:flex-wrap">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible">
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
                isActive ? getToneClasses(chip.tone).softHover : inactiveClass
              )}>
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', getToneClasses(chip.tone).dot)} />
              {chip.label}
            </Toggle>
          );
        })}
      </div>

      {stepFilters.length > 0 && (
        <>
          <div className="hidden lg:block w-px h-5 bg-border" />

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible">
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
          <div className="hidden lg:block w-px h-5 bg-border" />
          <div className="flex items-center gap-1.5">{children}</div>
        </>
      )}
    </div>
  );
};
