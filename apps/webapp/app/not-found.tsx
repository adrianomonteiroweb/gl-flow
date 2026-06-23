'use client';

import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="max-w-lg w-full p-8 text-center space-y-8 shadow-lg border-0">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">404</h1>
            <h2 className="text-3xl font-semibold text-foreground">Página não encontrada</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              A página que você está procurando não existe ou foi movida para outro lugar.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="flex items-center gap-2 font-medium">
              <Link href="/">
                <Home className="h-5 w-5" />
                Voltar ao início
              </Link>
            </Button>

            <Button variant="outline" size="lg" onClick={() => window.history.back()} className="flex items-center gap-2 font-medium">
              <ArrowLeft className="h-5 w-5" />
              Página anterior
            </Button>
          </div>

          <p className="text-sm text-muted-foreground/80">Se você acredita que isso é um erro, entre em contato com nossa equipe de suporte.</p>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
