import '@workspace/ui/globals.css';

import type { Metadata } from 'next';
import { Nunito_Sans, Taviraj, Pontano_Sans } from 'next/font/google';

import { Providers } from '@/components/commons/providers';
import { Toaster } from 'sonner';

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
};

export const metadata: Metadata = {
  title: 'glflow',
  description: '',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="w-full h-full overflow-hidden">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
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
