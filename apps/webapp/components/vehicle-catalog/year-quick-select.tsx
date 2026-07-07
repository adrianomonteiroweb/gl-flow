'use client';

import { cn } from '@workspace/ui/lib/utils';
import { Input } from '@workspace/ui/components/input';

const QUICK_YEARS = ['2026', '2025', '2024'];
const FALLBACK_YEAR = '2023';

interface YearQuickSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const YearQuickSelect = ({ value, onChange }: YearQuickSelectProps) => {
  const isQuickYear = QUICK_YEARS.includes(value);
  const isCustom = value !== '' && !isQuickYear;

  const chipClass = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-transparent text-muted-foreground hover:bg-muted'
    );

  const handleQuickYear = (year: string) => {
    onChange(value === year ? '' : year);
  };

  const handleOtherClick = () => {
    if (isCustom) {
      onChange('');
    } else {
      onChange(FALLBACK_YEAR);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_YEARS.map(year => (
          <button
            key={year}
            type="button"
            onClick={() => handleQuickYear(year)}
            aria-pressed={value === year}
            className={chipClass(value === year)}
          >
            {year}
          </button>
        ))}
        <button
          type="button"
          onClick={handleOtherClick}
          aria-pressed={isCustom}
          className={chipClass(isCustom)}
        >
          Outro
        </button>
      </div>

      {isCustom && (
        <Input
          type="number"
          inputMode="numeric"
          min={1900}
          max={2100}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-8 w-24"
        />
      )}
    </div>
  );
};
