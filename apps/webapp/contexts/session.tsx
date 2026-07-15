'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { loginWithPassword } from '@/actions/auth';
import { AppLoading } from '@/components/commons/loading';
import { getMe } from '@/actions/users';
import { SignIn } from '@/components/auth/signin';

type Props = {
  children: React.ReactNode;
};

type ProviderValue = {
  user: any;
  loading: boolean;
  handleAuthentication: (email: string, password: string) => Promise<any>;
};

const SessionContext = createContext<ProviderValue | undefined>(undefined);

export function SessionProvider({ children }: Props) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const pathname = usePathname();
  const router = useRouter();

  const publicRoutes = ['/login', '/privacy-policy', '/invite', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    getMe()
      .then(user => {
        setUser(user);
      })
      .catch(error => {
        console.error('Session check failed:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [mounted, isPublicRoute]);

  useEffect(() => {
    if (!mounted || loading) {
      return;
    }

    if (user && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [mounted, loading, user, pathname, router]);

  const handleAuthentication = async (email: string, password: string) => {
    try {
      const result = await loginWithPassword(email, password);

      if (result.status === 200 || result.status === 201) {
        setUser(result.user);
        router.push('/dashboard');
      }

      return result;
    } catch (error) {
      console.error('Authentication error:', error);
      return { status: 500 };
    }
  };

  const provider_value: ProviderValue = {
    user: user || null,
    loading,
    handleAuthentication,
  };

  return (
    <SessionContext.Provider value={provider_value}>
      {!mounted || loading ? <AppLoading /> : isPublicRoute ? children : !user ? <SignIn handleAuthentication={handleAuthentication} /> : children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);

  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }

  return context;
}
