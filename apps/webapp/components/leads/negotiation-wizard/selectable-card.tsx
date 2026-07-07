'use client';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';

interface SelectableCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export const SelectableCard = ({ icon: Icon, title, subtitle, selected, onSelect, disabled = false }: SelectableCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={disabled}
    aria-pressed={selected}
    className={cn(
      'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
      selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/50'
    )}>
    <Icon className={cn('h-5 w-5', selected ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
    <span className="text-sm font-medium text-foreground">{title}</span>
    {subtitle && <span className="text-[11px] leading-tight text-muted-foreground">{subtitle}</span>}
  </button>
);
