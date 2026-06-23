'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { usePathname } from 'next/navigation';

import { Suspense } from 'react';
import { AppSidebar } from '@/components/commons/app-sidebar';
import { AppLoading } from '@/components/commons/loading';
import { TooltipProvider } from '@workspace/ui/components/tooltip';
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar';
import { SessionProvider } from '@/contexts/session';
import { CompanyBrandTheme } from '@/components/company/company-brand-theme';
import { OnboardingReminder } from '@/components/onboarding/onboarding-reminder';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  // Define public routes that don't require the sidebar layout
  const publicRoutes = ['/login', '/reset-password', '/privacy-policy'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // The document print view renders chrome-less (no sidebar) for clean PDF output.
  // Auth is still enforced by the server action that loads the document.
  const isPrintRoute = pathname.startsWith('/proposals/') && pathname.endsWith('/print');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isBareLayout = isPublicRoute || isPrintRoute || isOnboardingRoute;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Always render the same structure to avoid hook order changes
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <CompanyBrandTheme />
        <TooltipProvider>
          {!mounted ? (
            <AppLoading />
          ) : isBareLayout ? (
            <Suspense fallback={<AppLoading />}>{children}</Suspense>
          ) : (
            <SidebarProvider className="flex flex-row">
              <AppSidebar className="absolute" />

              <SidebarInset>
                <Suspense fallback={<AppLoading />}>{children}</Suspense>
              </SidebarInset>
              <OnboardingReminder />
            </SidebarProvider>
          )}
        </TooltipProvider>
      </SessionProvider>
    </NextThemesProvider>
  );
}
