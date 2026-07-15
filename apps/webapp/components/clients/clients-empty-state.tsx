'use client';

import { PlugZapIcon, AlertCircleIcon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

export type ClientsEmptyStateType = 'no-integration' | 'error';

interface ClientsEmptyStateProps {
  type?: ClientsEmptyStateType;
  onRetry?: () => void;
}

export function ClientsEmptyState({ type = 'no-integration', onRetry }: ClientsEmptyStateProps) {
  const isError = type === 'error';

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 px-4 py-20">
      {/* Icon container */}
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          isError ? 'bg-destructive/10' : 'bg-primary/10'
        }`}
        role="img"
        aria-hidden="true"
      >
        {isError ? (
          <AlertCircleIcon className="h-8 w-8 text-destructive" />
        ) : (
          <PlugZapIcon className="h-8 w-8 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">
            {isError ? 'Não foi possível conectar' : 'Nenhum cliente importado ainda'}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isError ? (
              <>
                Houve um problema ao buscar os clientes. Verifique sua conexão com a internet e tente novamente.{' '}
                <span className="block pt-1">Se o problema persistir, entre em contato com o suporte.</span>
              </>
            ) : (
              <>
                Os clientes aparecem aqui automaticamente após a integração com o sistema de vendas ser configurada.{' '}
                <span className="block pt-1">Leads que fecham negócio são convertidos para esta lista.</span>
              </>
            )}
          </p>
        </div>

        {/* Action button */}
        {isError && onRetry && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              aria-label="Tentar novamente para carregar clientes"
            >
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
