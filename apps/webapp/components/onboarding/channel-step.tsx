'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Check, ExternalLink, LogIn, MessageCircle, Send } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import SubmitButton from '@workspace/ui/components/submit-button';

import { getIntegration } from '@/lib/integrations/registry';
import { saveIntegrationCredentials } from '@/actions/integrations';
import { ConnectionTestResult } from '@/components/integrations/connection-test-result';
import { CredentialFieldInput } from '@/components/integrations/credential-field-input';

type ChannelId = 'telegram' | 'whatsapp';

type ChannelOption = {
  id: ChannelId;
  label: string;
  tagline: string;
  icon: typeof Send;
};

const CHANNELS: ChannelOption[] = [
  { id: 'telegram', label: 'Telegram', tagline: 'Caminho rápido — só o token do bot', icon: Send },
  { id: 'whatsapp', label: 'WhatsApp', tagline: 'Mais completo — requer credenciais da Meta', icon: MessageCircle },
];

type Props = {
  onDone: (status: 'done' | 'skipped') => void | Promise<void>;
  onBack?: () => void;
  onCancel?: () => void;
};

export const ChannelOnboardingStep = ({ onDone, onBack, onCancel }: Props) => {
  const [selected, setSelected] = useState<ChannelId>('telegram');
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const definition = getIntegration(selected)!;
  const missingRequired = definition.credentialFields.some(field => field.required && !values[field.key]?.trim());

  const selectChannel = (id: ChannelId): void => {
    setSelected(id);
    setValues({});
    setError(null);
  };

  const handleConnect = async (): Promise<void> => {
    setIsSaving(true);
    setError(null);
    const result = await saveIntegrationCredentials(selected, values);
    setIsSaving(false);

    if (result.success) {
      toast.success(`${definition.name} conectado com sucesso.`);
      await onDone('done');
      return;
    }
    setError(result.error ?? 'Não foi possível conectar.');
  };

  const handleSkip = async (): Promise<void> => {
    setIsSkipping(true);
    await onDone('skipped');
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Conecte um canal de atendimento</h2>
        <p className="text-sm text-muted-foreground">Conecte um canal para começar a receber e responder leads automaticamente.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CHANNELS.map(channel => {
          const Icon = channel.icon;
          const isActive = selected === channel.id;
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => selectChannel(channel.id)}
              className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors ${
                isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{channel.label}</span>
                </div>
                {isActive && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">{channel.tagline}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {definition.credentialFields.map((field, index) => (
          <CredentialFieldInput
            key={`${selected}-${field.key}`}
            field={field}
            value={values[field.key] ?? ''}
            autoFocus={index === 0}
            onChange={value => setValues(prev => ({ ...prev, [field.key]: value }))}
          />
        ))}
        {error && <ConnectionTestResult state="error" message={error} />}
        {definition.docsUrl && (
          <a href={definition.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Documentação
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onCancel} disabled={isSaving || isSkipping}>
              <LogIn className="h-4 w-4" />
              Voltar ao login
            </Button>
          )}
          {onBack && (
            <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={isSaving || isSkipping}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
        </div>
        <div className="hidden flex-1 sm:block" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isSaving || isSkipping}
            className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 sm:w-auto">
            Configurar depois
          </Button>
          <SubmitButton isSubmitting={isSaving} onClick={handleConnect} disabled={missingRequired || isSaving || isSkipping} className="w-full sm:w-auto">
            Testar e conectar
          </SubmitButton>
        </div>
      </div>
    </div>
  );
};

export default ChannelOnboardingStep;
