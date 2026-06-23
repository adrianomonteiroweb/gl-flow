import '@workspace/ui/globals.css';

import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Nunito_Sans, Taviraj, Pontano_Sans } from 'next/font/google';

import { Providers } from '@/components/commons/providers';

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const taviraj = Taviraj({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const pontanoSans = Pontano_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400'],
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export const metadata: Metadata = {
  applicationName: 'Linhares Flow',
  title: {
    default: 'Linhares Flow',
    template: '%s | Linhares Flow',
  },
  description: 'Plataforma de gestão do Grupo Linhares.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Linhares Flow',
  },
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-tap-highlight': 'no',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="w-full h-full overflow-hidden">
      <body
        className={`${nunitoSans.variable} ${taviraj.variable} ${pontanoSans.variable} font-sans antialiased w-full h-full`}
        suppressHydrationWarning>
        <Toaster
          theme="system"
          className="toaster group"
          toastOptions={{
            classNames: {
              toast:
                'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
              description: 'group-[.toast]:text-muted-foreground',
              actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
              cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
            },
          }}
          richColors
          position="top-center"
        />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
