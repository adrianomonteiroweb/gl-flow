'use client';

import { useSidebar } from '@workspace/ui/components/sidebar';
import { LinharesSymbol } from '@workspace/ui/components/logos/linhares';

export function AppLogo() {
  const { state } = useSidebar();

  if (state === 'collapsed') {
    return (
      <div className="flex h-9 items-center justify-center px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <LinharesSymbol height={18} className="text-sidebar-primary-foreground" accent="currentColor" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-11 items-center gap-2.5 px-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <LinharesSymbol height={18} className="text-sidebar-primary-foreground" accent="currentColor" />
      </div>
      <div className="grid leading-tight">
        <span className="truncate text-sm font-semibold text-sidebar-foreground">Grupo Linhares</span>
        <span className="truncate text-xs text-sidebar-muted-foreground">Linhares Flow</span>
      </div>
    </div>
  );
}
