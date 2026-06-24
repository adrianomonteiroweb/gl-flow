'use client';

import { CloudOff, Loader2, UserRound } from 'lucide-react';

import { cpfOrCnpj } from '@workspace/utils/text';

import { useOfflineSyncContext, type OfflineClientItem } from '@/contexts/offline-sync';

const getSecondaryInfo = (payload: OfflineClientItem['payload']): string => {
  if (payload.document) {
    return cpfOrCnpj(payload.document);
  }

  if (payload.phone) {
    return payload.phone;
  }

  return payload.email ?? '';
};

export const PendingClientsList = () => {
  const { pending_clients, is_syncing } = useOfflineSyncContext();

  if (pending_clients.length === 0) {
    return null;
  }

  const count = pending_clients.length;
  const heading = count === 1 ? '1 cliente aguardando sincronização' : `${count} clientes aguardando sincronização`;

  return (
    <section
      aria-label="Clientes salvos localmente, aguardando sincronização"
      className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-start gap-2.5 border-b border-amber-200 px-4 py-3 dark:border-amber-900">
        {is_syncing ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600 dark:text-amber-400" aria-hidden="true" />
        ) : (
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        )}

        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300" role="status" aria-live="polite">
            {is_syncing ? 'Sincronizando clientes...' : heading}
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/70">
            Salvos neste dispositivo. Enviaremos automaticamente quando a conexão voltar.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-amber-200/70 dark:divide-amber-900/70">
        {pending_clients.map(item => {
          const secondary = getSecondaryInfo(item.payload);

          return (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.payload.name}</p>
                {secondary && <p className="truncate text-xs text-muted-foreground">{secondary}</p>}
              </div>

              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                {is_syncing ? 'Enviando' : 'Pendente'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
