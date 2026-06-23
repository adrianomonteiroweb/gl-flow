'use client';

import Link from 'next/link';

import { useEffect } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { RefreshCw, Home } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
}

const ErrorPage = ({ error }: ErrorPageProps) => {
  useEffect(() => {
    // Log do erro para debugging
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="max-w-lg w-full p-8 text-center space-y-8 shadow-lg border-0">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-destructive to-destructive/60 bg-clip-text text-transparent">500</h1>
            <h2 className="text-3xl font-semibold text-foreground">Algo deu errado!</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ocorreu um erro inesperado. Nossa equipe foi notificada e estará trabalhando para resolver o problema.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} size="lg" className="flex items-center gap-2 font-medium w-full">
              <RefreshCw className="h-5 w-5" />
              Tentar novamente
            </Button>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" size="lg" onClick={() => (window.location.href = '/')} className="flex items-center gap-2 font-medium flex-1">
                <Home className="h-5 w-5" />
                Voltar ao início
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground/80">
            Se o problema persistir, entre em contato com nossa equipe de{' '}
            <Link href="https://example.com" target="_blank" className="text-primary">
              suporte
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ErrorPage;
