'use client';

import { cn } from '@workspace/ui/lib/utils';

import { SEGMENT_OPTIONS } from '@/lib/vehicles/segments';

export type SegmentFilter = 'all' | (typeof SEGMENT_OPTIONS)[number]['value'];

interface SegmentTabsProps {
  value: SegmentFilter;
  onChange: (value: SegmentFilter) => void;
}

const OPTIONS: { value: SegmentFilter; label: string }[] = [{ value: 'all', label: 'Todos' }, ...SEGMENT_OPTIONS];

export const SegmentTabs = ({ value, onChange }: SegmentTabsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map(option => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'rounded-full border px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-transparent text-muted-foreground hover:bg-muted'
            )}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
