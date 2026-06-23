'use client';

import type { ReactNode } from 'react';

import { useRequireSettingsAccess } from '@/hooks/use-require-settings-access';

type Props = {
  children: ReactNode;
};

export function SettingsGuard({ children }: Props) {
  const allowed = useRequireSettingsAccess();

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
