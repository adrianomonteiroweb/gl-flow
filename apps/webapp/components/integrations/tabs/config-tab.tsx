'use client';

import { useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, PlugZap, Power, ShieldCheck } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Switch } from '@workspace/ui/components/switch';
import { Label } from '@workspace/ui/components/label';
import { Badge } from '@workspace/ui/components/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';

import type { IntegrationDefinition } from '@/lib/integrations/registry';
import type { IntegrationViewModel } from '@/actions/integrations';

import { ConnectionTestResult } from '../connection-test-result';

type Props = {
  definition: IntegrationDefinition;
  state: IntegrationViewModel;
  canManage: boolean;
  isTesting: boolean;
  onUpdateCredentials: () => void;
  onToggle: (enabled: boolean) => void;
  onDisconnect: () => void;
  onTestConnection: () => Promise<{ success: boolean; error?: string }>;
};

export const ConfigTab = ({ definition, state, canManage, isTesting, onUpdateCredentials, onToggle, onDisconnect, onTestConnection }: Props) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ state: 'success' | 'error'; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTestResult(null);
    const result = await onTestConnection();

    if (result.success) {
      setTestResult({ state: 'success', message: 'Conexão validada com sucesso.' });
      return;
    }

    setTestResult({ state: 'error', message: result.error ?? 'Não foi possível validar a conexão.' });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status da conexão</CardTitle>
          <CardDescription className="text-sm">Pause temporariamente sem perder as credenciais salvas.</CardDescription>

          <CardAction>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  state.enabled
                    ? 'border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                }
              >
                {state.enabled ? 'Ativo' : 'Pausado'}
              </Badge>

              <Switch
                id="enabled-toggle"
                checked={state.enabled}
                disabled={!canManage}
                onCheckedChange={onToggle}
                aria-label={state.enabled ? 'Desativar integração' : 'Ativar integração'}
              />
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <div>
            <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={!canManage || isTesting}>
              {isTesting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PlugZap className="mr-1.5 h-4 w-4" />}
              {isTesting ? 'Testando...' : 'Testar conexão'}
            </Button>
          </div>

          {testResult && <ConnectionTestResult state={testResult.state} message={testResult.message} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground" />
            <CardTitle className="text-base">Credenciais</CardTitle>
          </div>

          <CardDescription className="text-sm">
            {state.credentialHint
              ? `Conectado com a chave terminada em •••• ${state.credentialHint}.`
              : 'Credenciais armazenadas com segurança.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {definition.credentialFields.map(field => (
              <div
                key={field.key}
                className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3.5 py-2.5"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{field.label}</p>
                  <p className="font-mono text-sm text-muted-foreground">••••••••</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Button variant="outline" size="sm" onClick={onUpdateCredentials} disabled={!canManage}>
              <KeyRound className="mr-1.5 h-4 w-4" />
              Atualizar credenciais
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Desconectar</CardTitle>
          <CardDescription className="text-sm">
            Remove as credenciais e desativa a integração. Esta ação não pode ser desfeita.
          </CardDescription>

          <CardAction>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={!canManage}
              onClick={() => setConfirmOpen(true)}
            >
              <Power className="mr-1.5 h-4 w-4" />
              Desconectar
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar {definition.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              As credenciais salvas serão removidas e a integração será desativada. Você precisará configurá-la novamente para reconectar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setConfirmOpen(false);
                onDisconnect();
              }}
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
