'use client';

import { LinharesSymbol } from '@workspace/ui/components/logos/linhares';

export function AppLoading() {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-black">
      <LinharesSymbol height={72} className="animate-pulse text-white" />
    </div>
  );
}
