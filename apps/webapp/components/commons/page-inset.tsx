'use client';

import { AppHeader } from '@/components/commons/app-header';
import { ScrollArea } from '@workspace/ui/components/scroll-area';

export function PageInset({ children, className, ...props }: any) {
  return (
    <div className="flex flex-col h-screen w-full">
      <AppHeader {...props} />
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full [&_[data-slot=scroll-area-viewport]>div]:!block">
          <div className={className ?? 'min-h-full w-full'}>{children}</div>
        </ScrollArea>
      </div>
    </div>
  );
}
