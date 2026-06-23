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

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  const publicRoutes = ['/login', '/reset-password', '/privacy-policy', '/invite'];
  const isBareLayout = publicRoutes.some(route => pathname.startsWith(route));

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
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
            </SidebarProvider>
          )}
        </TooltipProvider>
      </SessionProvider>
    </NextThemesProvider>
  );
}
