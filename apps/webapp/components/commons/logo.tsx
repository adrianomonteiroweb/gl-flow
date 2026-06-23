'use client';

import { useSidebar } from '@workspace/ui/components/sidebar';

export function AppLogo() {
  const { state } = useSidebar();

  if (state === 'collapsed') {
    return (
      <div className="flex h-9 items-center justify-center px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
          GL
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-10 items-center px-2">
      <span className="truncate text-sm font-semibold tracking-normal text-sidebar-foreground">glflow</span>
    </div>
  );
}
