'use client';

import { WifiOff } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';

import { useOfflineSyncContext } from '@/contexts/offline-sync';

export const OfflineIndicator = ({ className }: { className?: string }) => {
  const { is_online } = useOfflineSyncContext();

  if (is_online) {
    return null;
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
        className
      )}>
      <WifiOff className="h-3 w-3 shrink-0" aria-hidden="true" />
      Sem conexão
    </span>
  );
};
