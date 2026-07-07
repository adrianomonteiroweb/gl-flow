'use client';

import type { ReactNode } from 'react';
import { Bike } from 'lucide-react';

import { formatCurrency } from '@workspace/utils/text';
import { cn } from '@workspace/ui/lib/utils';

import { segmentLabel, conditionLabel, formatModelYear } from '@/lib/vehicles/segments';
import type { VehicleModel } from './types';

interface VehicleModelCardProps {
  model: VehicleModel;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  footer?: ReactNode;
}

const toNumber = (price: VehicleModel['price']): number | null => {
  const value = typeof price === 'string' ? Number(price) : price;

  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return value;
};

const formatPrice = (price: VehicleModel['price']): string => {
  const value = toNumber(price);

  return value === null ? '—' : formatCurrency(value);
};

const formatInstallment = (price: VehicleModel['price']): string | null => {
  const value = toNumber(price);

  if (!value || value <= 0) {
    return null;
  }

  const installments = 36;
  const perMonth = Math.round(value / installments);

  return `ou ${installments}x de ${formatCurrency(perMonth)}`;
};

export const VehicleModelCard = ({ model, selectable = false, selected = false, onSelect, footer }: VehicleModelCardProps) => {
  const year = formatModelYear(model);
  const isInactive = !model.is_active;
  const installment = formatInstallment(model.price);
  const subtitle = [segmentLabel(model.segment), year].filter(Boolean).join(' · ');

  const content = (
    <>
      <div className="absolute left-3 top-3 flex flex-col gap-1">
        {model.condition === 'new' && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            0KM
          </span>
        )}
        {model.condition === 'used' && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            {conditionLabel(model.condition)}
          </span>
        )}
        {isInactive && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Inativo
          </span>
        )}
      </div>

      <div className="flex h-20 items-center justify-center sm:h-28">
        {model.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={model.image_url} alt={model.model} className="max-h-20 w-full object-contain sm:max-h-28" />
        ) : (
          <Bike className="h-10 w-10 text-muted-foreground/40 sm:h-12 sm:w-12" aria-hidden="true" />
        )}
      </div>

      <div className="mt-1 sm:mt-2">
        <p className="text-sm font-semibold text-foreground">{model.model}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        <p className="mt-1 text-sm font-bold text-primary">{formatPrice(model.price)}</p>
        {installment && <p className="text-[11px] text-muted-foreground">{installment}</p>}
      </div>
    </>
  );

  const baseClass = cn(
    'relative flex flex-col rounded-xl border bg-card p-2.5 transition-colors sm:p-4',
    selectable && 'cursor-pointer hover:border-primary/60',
    selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
    isInactive && 'opacity-70'
  );

  if (selectable) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(baseClass, 'text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary')}>
        {content}
      </button>
    );
  }

  return (
    <div className={baseClass}>
      {content}
      {footer && <div className="mt-3 border-t border-border pt-3">{footer}</div>}
    </div>
  );
};
