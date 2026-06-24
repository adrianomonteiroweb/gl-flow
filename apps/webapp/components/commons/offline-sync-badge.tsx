'use client';

import { CloudOff, Loader2 } from 'lucide-react';

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@workspace/ui/components/sidebar';

import { useOfflineSyncContext } from '@/contexts/offline-sync';

export const OfflineSyncBadge = () => {
  const { is_syncing, pending_count } = useOfflineSyncContext();

  if (!is_syncing && pending_count === 0) {
    return null;
  }

  return (
    <SidebarMenu role="status" aria-live="polite">
      <SidebarMenuItem>
        <SidebarMenuButton
          size="sm"
          className="cursor-default text-amber-600 hover:bg-amber-50 hover:text-amber-600 dark:text-amber-400 dark:hover:bg-amber-950 dark:hover:text-amber-400">
          {is_syncing ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}

          <span className="truncate text-xs">
            {is_syncing ? 'Sincronizando...' : `${pending_count} aguardando sync`}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
