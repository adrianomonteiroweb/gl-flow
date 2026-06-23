'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';

type Props = {
  state: 'success' | 'error';
  message: string;
};

/** Inline feedback for the wizard's connection test step. */
export const ConnectionTestResult = ({ state, message }: Props) => {
  const isSuccess = state === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border p-3 text-sm',
        isSuccess
          ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
          : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
      )}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="break-words">{message}</p>
    </div>
  );
};
