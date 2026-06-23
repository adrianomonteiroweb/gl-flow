'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Plug } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Card, CardContent } from '@workspace/ui/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { useSessionContext } from '@/contexts/session';
import { canManageIntegrations } from '@/lib/auth/permissions';
import { getIntegration } from '@/lib/integrations/registry';
import { getCredentialValues, type CredentialValues } from '@/actions/integrations';

import { useIntegration } from './use-integrations';
import { IntegrationStatusBadge } from './integration-status-badge';
import { IntegrationWizard } from './integration-wizard';
import { OverviewTab } from './tabs/overview-tab';
import { ConfigTab } from './tabs/config-tab';
import { SyncTab } from './tabs/sync-tab';

type WizardMode = 'create' | 'edit';

export const IntegrationDetail = ({ provider }: { provider: string }) => {
  const definition = getIntegration(provider);
  const { user } = useSessionContext();
  const canManage = canManageIntegrations(user?.role);
  const { state, isLoading, isSyncing, isTesting, toggleEnabled, saveCredentials, disconnect, sync, testConnection } = useIntegration(provider);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>('create');
  const [initialValues, setInitialValues] = useState<CredentialValues | null>(null);
  const [tab, setTab] = useState('overview');

  if (!definition) {
    return null;
  }

  if (isLoading || !state) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const openWizardForCreate = () => {
    setWizardMode('create');
    setInitialValues(null);
    setWizardOpen(true);
  };

  const openWizardForEdit = async () => {
    setWizardMode('edit');
    const result = await getCredentialValues(provider);

    if (result.success) {
      setInitialValues(result.data);
    }

    setWizardOpen(true);
  };

  return (
    <div className="space-y-6">
      <Link href="/settings/integrations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Apps e Integrações
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src={definition.logo} alt={definition.name} width={52} height={52} className="rounded-xl" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{definition.name}</h1>
              <IntegrationStatusBadge status={state.status} />
            </div>
            <p className="text-sm text-muted-foreground">{definition.shortDescription}</p>
          </div>
        </div>

        {!state.connected && (
          <Button onClick={openWizardForCreate} disabled={!canManage}>
            <Plug className="mr-1 h-4 w-4" />
            Conectar
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="config" disabled={!state.connected}>
            Configuração
          </TabsTrigger>
          {definition.canSync && (
            <TabsTrigger value="sync" disabled={!state.connected}>
              Sincronização
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab definition={definition} state={state} canManage={canManage} onConnect={openWizardForCreate} />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <ConfigTab
            definition={definition}
            state={state}
            canManage={canManage}
            isTesting={isTesting}
            onUpdateCredentials={openWizardForEdit}
            onToggle={toggleEnabled}
            onDisconnect={disconnect}
            onTestConnection={testConnection}
          />
        </TabsContent>

        {definition.canSync && (
          <TabsContent value="sync" className="mt-4">
            <SyncTab state={state} canManage={canManage} isSyncing={isSyncing} onSync={sync} />
          </TabsContent>
        )}
      </Tabs>

      <IntegrationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        definition={definition}
        onSave={saveCredentials}
        mode={wizardMode}
        initialValues={initialValues}
      />
    </div>
  );
};
