import { Check } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';

import type { WizardStep } from './types';

const NODES: { label: string }[] = [
  { label: 'Cliente' },
  { label: 'Veículo' },
  { label: 'Proposta' },
  { label: 'Financiamento' },
  { label: 'Aprovação' },
  { label: 'Faturamento' },
  { label: 'Entrega' },
];

// payment e consorcio compartilham o nó 4 ("Financiamento").
const STEP_INDEX: Record<WizardStep, number> = {
  client: 0,
  vehicle: 1,
  proposal: 2,
  payment: 3,
  consorcio: 3,
  approval: 4,
  invoicing: 5,
  delivery: 6,
};

export const StepIndicator = ({ step }: { step: WizardStep }) => {
  const active = STEP_INDEX[step];
  const total = NODES.length;

  return (
    <>
      <div className="sm:hidden">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">{NODES[active]?.label}</span>
          <span className="text-[11px] text-muted-foreground">
            {active + 1}/{total}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((active + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div className="hidden items-center sm:flex">
        {NODES.map((node, index) => {
          const done = index < active;
          const current = index === active;

          return (
            <div key={node.label} className={cn('flex items-center', index < total - 1 && 'flex-1')}>
              <div className="flex items-center gap-2">
                <div
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                    done && 'bg-emerald-500 text-white dark:bg-emerald-600',
                    current && 'bg-primary text-primary-foreground',
                    !done && !current && 'bg-muted text-muted-foreground'
                  )}>
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className={cn('hidden text-xs font-medium lg:inline', current ? 'text-foreground' : 'text-muted-foreground')}>{node.label}</span>
              </div>
              {index < total - 1 && <div className={cn('mx-1.5 h-0.5 flex-1 rounded-full lg:mx-2', done ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-muted')} />}
            </div>
          );
        })}
      </div>
    </>
  );
};
