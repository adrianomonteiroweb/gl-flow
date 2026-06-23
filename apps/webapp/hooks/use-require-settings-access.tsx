'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSessionContext } from '@/contexts/session';
import { canAccessSettings } from '@/lib/auth/permissions';

export const useRequireSettingsAccess = (): boolean => {
  const { user, loading } = useSessionContext();
  const router = useRouter();

  const allowed = canAccessSettings(user?.role);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      return;
    }

    if (!allowed) {
      router.replace('/leads');
    }
  }, [loading, user, allowed, router]);

  return allowed;
};
