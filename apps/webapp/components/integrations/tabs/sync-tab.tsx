'use client';

import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';

import type { IntegrationViewModel } from '@/actions/integrations';

type Props = {
  state: IntegrationViewModel;
  canManage: boolean;
  isSyncing: boolean;
  onSync: () => void;
};

const formatDateTime = (iso: string | null): string => {
  if (!iso) return 'Nunca sincronizado';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md border bg-muted/30 px-3 py-2 text-center">
    <p className="text-2xl font-semibold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export const SyncTab = ({ state, canManage, isSyncing, onSync }: Props) => {
  const result = state.lastSyncResult;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sincronização</CardTitle>
          <CardDescription>Última sincronização: {formatDateTime(state.lastSyncAt)}</CardDescription>
          <CardAction>
            <Button size="sm" onClick={onSync} disabled={!canManage || isSyncing || !state.enabled}>
              <RefreshCw className={`mr-1 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </Button>
          </CardAction>
        </CardHeader>

        {result && (
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Criados" value={result.created} />
              <Metric label="Atualizados" value={result.updated} />
              <Metric label="Removidos" value={result.removed} />
            </div>
          </CardContent>
        )}
      </Card>

      {!state.enabled && (
        <p className="text-xs text-muted-foreground">Habilite a integração na aba Configuração para sincronizar.</p>
      )}

      {state.lastError && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-4 w-4" />
              Último erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-words text-sm text-muted-foreground">{state.lastError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
