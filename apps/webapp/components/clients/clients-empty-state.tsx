'use client';

import { PlugZapIcon } from 'lucide-react';

export function ClientsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <PlugZapIcon className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="font-semibold text-foreground">Nenhum cliente importado ainda</p>
        <p className="text-sm text-muted-foreground">
          Os clientes aparecem aqui automaticamente após a integração com o sistema de vendas ser configurada. Leads que
          fecham negócio são convertidos para esta lista.
        </p>
      </div>
    </div>
  );
}
