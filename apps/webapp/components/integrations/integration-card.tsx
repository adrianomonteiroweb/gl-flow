'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Switch } from '@workspace/ui/components/switch';
import { Card, CardContent } from '@workspace/ui/components/card';

import type { IntegrationDefinition } from '@/lib/integrations/registry';
import type { IntegrationViewModel } from '@/actions/integrations';
import { IntegrationStatusBadge } from './integration-status-badge';

type Props = {
  definition: IntegrationDefinition;
  state: IntegrationViewModel;
  canManage: boolean;
  onToggle: (enabled: boolean) => void;
};

export const IntegrationCard = ({ definition, state, canManage, onToggle }: Props) => {
  return (
    <Card className="group relative transition-colors hover:border-primary/40">
      {/* Whole card links to the detail page. The switch below stops propagation. */}
      <Link href={`/settings/integrations/${definition.id}`} className="absolute inset-0 z-0" aria-label={`Abrir ${definition.name}`} />

      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src={definition.logo} alt={definition.name} width={44} height={44} className="rounded-lg" />
            <div>
              <p className="font-medium leading-tight">{definition.name}</p>
              <p className="text-xs text-muted-foreground">{definition.categoryLabel}</p>
            </div>
          </div>
          <IntegrationStatusBadge status={state.status} />
        </div>

        <p className="text-sm text-muted-foreground">{definition.shortDescription}</p>

        <div className="z-10 flex items-center justify-between">
          {state.connected ? (
            <div
              className="flex items-center gap-2"
              onClick={e => e.preventDefault()}
              onKeyDown={e => e.stopPropagation()}
              role="presentation">
              <Switch
                checked={state.enabled}
                disabled={!canManage}
                onCheckedChange={onToggle}
                aria-label={state.enabled ? 'Desabilitar integração' : 'Habilitar integração'}
              />
              <span className="text-xs text-muted-foreground">{state.enabled ? 'Ativo' : 'Pausado'}</span>
            </div>
          ) : (
            <span className="text-xs font-medium text-primary">Conectar →</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
