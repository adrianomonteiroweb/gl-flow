'use client';

import { Check, Circle } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';
import { checkPasswordRules } from '@/lib/auth/password-rules';

type Props = {
  password: string;
};

const strengthColor = (passed: number, total: number): string => {
  const ratio = passed / total;

  if (ratio <= 0.33) {
    return 'bg-red-500';
  }

  if (ratio <= 0.66) {
    return 'bg-amber-500';
  }

  return 'bg-green-500';
};

export const PasswordStrengthIndicator = ({ password }: Props) => {
  if (!password) {
    return null;
  }

  const checks = checkPasswordRules(password);
  const visibleChecks = checks.filter(c => c.id !== 'max_length');
  const passed = visibleChecks.filter(c => c.passed).length;
  const total = visibleChecks.length;
  const widthPercent = Math.round((passed / total) * 100);

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-300', strengthColor(passed, total))} style={{ width: `${widthPercent}%` }} />
      </div>
      <ul className="flex flex-col gap-1">
        {visibleChecks.map(check => (
          <li key={check.id} className="flex items-center gap-2 text-xs">
            {check.passed ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            )}
            <span className={cn(check.passed ? 'text-muted-foreground' : 'text-foreground')}>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
