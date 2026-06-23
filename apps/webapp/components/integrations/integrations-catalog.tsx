'use client';

import { useMemo, useState } from 'react';
import { Plug } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent } from '@workspace/ui/components/card';

import { useSessionContext } from '@/contexts/session';
import { canManageIntegrations } from '@/lib/auth/permissions';
import { getIntegration } from '@/lib/integrations/registry';
import { useIntegrationsList } from './use-integrations';
import { IntegrationCard } from './integration-card';

type Filter = 'all' | 'connected' | 'available';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'connected', label: 'Conectados' },
  { value: 'available', label: 'Disponíveis' },
];

export const IntegrationsCatalog = () => {
  const { user } = useSessionContext();
  const canManage = canManageIntegrations(user?.role);
  const { items, isLoading, loadError, refetch, toggleEnabled } = useIntegrationsList();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    return items.filter(item => {
      if (filter === 'connected') return item.connected;
      if (filter === 'available') return !item.connected;
      return true;
    });
  }, [items, filter]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Carregando integrações...</p>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button onClick={refetch} variant="outline" size="sm">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Apps e Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Conecte a plataforma às ferramentas que você já usa. Habilite, configure credenciais e acompanhe o status de cada integração.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
        {FILTERS.map(option => (
          <Button
            key={option.value}
            size="sm"
            variant={filter === option.value ? 'default' : 'ghost'}
            className="h-8"
            onClick={() => setFilter(option.value)}>
            {option.label}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Plug className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma integração nesta categoria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(item => {
            const definition = getIntegration(item.id);
            if (!definition) return null;
            return (
              <IntegrationCard
                key={item.id}
                definition={definition}
                state={item}
                canManage={canManage}
                onToggle={enabled => toggleEnabled(item.id, enabled)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
