'use client';

import { createContext, useContext, useEffect } from 'react';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { createSession } from '@/actions/auth';
import { AppLoading, cacheCompanyBranding } from '@/components/commons/loading';
import { getMe } from '@/actions/users';
import { getCompanyProfile } from '@/actions/company';
import { getOnboardingState } from '@/actions/onboarding';
import { SignIn } from '@/components/auth/signin';
import { isCompanyConfigured, type CompanyProfile } from '@/lib/company/profile';
import { INITIAL_ONBOARDING_STATE, isOnboardingComplete } from '@/lib/onboarding/state';

export type SessionType = {
  id?: number;
  name: string;
};

type Props = {
  children: React.ReactNode;
};

type ProviderValue = {
  user: any;
  loading: boolean;
  companyProfile: CompanyProfile | null;
  updateCompanyProfile: (company: CompanyProfile | null) => void;
  handleAuthentication: (email: string, password: string) => Promise<any>;
};

const SessionContext = createContext<ProviderValue | undefined>(undefined);

export function SessionProvider({ children }: Props) {
  const [user, setUser] = useState<any | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const pathname = usePathname();
  const router = useRouter();

  const publicRoutes = ['/login', '/reset-password', '/privacy-policy', '/invite'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isOnboardingRoute = pathname.startsWith('/onboarding');

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

    let shouldKeepLoading = false;

    getMe()
      .then(async user => {
        setUser(user);

        if (!user) {
          setCompanyProfile(null);
          return;
        }

        const [companyResult, onboardingResult] = await Promise.all([getCompanyProfile(), getOnboardingState()]);
        const company = companyResult.success ? companyResult.data : null;
        setCompanyProfile(company);

        const companyConfigured = isCompanyConfigured(company);
        const onboardingState = onboardingResult.success ? onboardingResult.data : INITIAL_ONBOARDING_STATE;
        const onboardingComplete = companyConfigured && isOnboardingComplete(onboardingState);

        if (!companyConfigured && !isOnboardingRoute) {
          shouldKeepLoading = true;
          router.replace('/onboarding');
          return;
        }

        if (isOnboardingRoute && onboardingComplete) {
          shouldKeepLoading = true;
          router.replace('/leads');
        }
      })
      .catch(error => {
        console.error('Session check failed:', error);
      })
      .finally(() => {
        if (!shouldKeepLoading) {
          setLoading(false);
        }
      });
  }, [mounted, isPublicRoute, isOnboardingRoute, router]);

  useEffect(() => {
    if (!companyProfile) {
      return;
    }

    cacheCompanyBranding({
      logoUrl: companyProfile.logoUrl || '',
      companyName: companyProfile.nomeFantasia || companyProfile.razaoSocial || '',
      brandColors: companyProfile.brandColors,
      useLogoColors: companyProfile.useLogoColors,
    });
  }, [companyProfile]);

  useEffect(() => {
    if (!mounted || loading) {
      return;
    }

    if (user && pathname === '/login') {
      router.replace('/leads');
    }
  }, [mounted, loading, user, pathname, router]);

  const handleAuthentication = async (email: string, password: string) => {
    try {
      const { user, status } = await createSession(email, password);

      if (status === 200 || status === 201) {
        setUser(user);
        router.push('/');
      }

      return { status };
    } catch (error) {
      console.error('Authentication error:', error);
      return { status: 500 };
    }
  };

  const provider_value: ProviderValue = {
    user: user || null,
    loading,
    companyProfile,
    updateCompanyProfile: setCompanyProfile,
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
