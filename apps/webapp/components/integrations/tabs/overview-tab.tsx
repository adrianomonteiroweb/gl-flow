'use client';

import { Plug, ExternalLink } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';

import type { IntegrationDefinition } from '@/lib/integrations/registry';
import { getCapabilityLabel } from '@/lib/integrations/registry';
import type { IntegrationViewModel } from '@/actions/integrations';

type Props = {
  definition: IntegrationDefinition;
  state: IntegrationViewModel;
  canManage: boolean;
  onConnect: () => void;
};

export const OverviewTab = ({ definition, state, canManage, onConnect }: Props) => {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre</CardTitle>
          <CardDescription>{definition.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-sm font-medium">Recursos</p>
          <ul className="flex flex-col gap-1.5">
            {definition.capabilities.map(capability => (
              <li key={capability} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Plug className="h-3.5 w-3.5 text-primary" />
                {getCapabilityLabel(capability)}
              </li>
            ))}
          </ul>

          {definition.docsUrl && (
            <a href={definition.docsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Documentação
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </CardContent>
      </Card>

      {!state.connected && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">Esta integração ainda não foi conectada.</p>
            <Button onClick={onConnect} disabled={!canManage}>
              <Plug className="mr-1 h-4 w-4" />
              Conectar {definition.name}
            </Button>
            {!canManage && <p className="text-xs text-muted-foreground">Apenas proprietário e administrador podem conectar integrações.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
