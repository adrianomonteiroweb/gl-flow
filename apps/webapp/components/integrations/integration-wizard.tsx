'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, ExternalLink, HelpCircle } from 'lucide-react';

import SubmitButton from '@workspace/ui/components/submit-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import type { IntegrationDefinition } from '@/lib/integrations/registry';

import { CredentialFieldInput } from './credential-field-input';
import { ConnectionTestResult } from './connection-test-result';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: IntegrationDefinition;
  onSave: (values: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  mode?: 'create' | 'edit';
  initialValues?: Record<string, string> | null;
};

const generateHexToken = (bytes: number): string => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
};

const buildInitialValues = (definition: IntegrationDefinition, mode: 'create' | 'edit', initialValues?: Record<string, string> | null): Record<string, string> => {
  if (mode === 'edit' && initialValues) {
    return { ...initialValues };
  }

  const values: Record<string, string> = {};

  for (const field of definition.credentialFields) {
    if (mode === 'create' && field.autoGenerate && field.generate) {
      values[field.key] = generateHexToken(field.generate.bytes);
    } else {
      values[field.key] = '';
    }
  }

  return values;
};

export const IntegrationWizard = ({ open, onOpenChange, definition, onSave, mode = 'create', initialValues }: Props) => {
  const [values, setValues] = useState<Record<string, string>>(() => buildInitialValues(definition, mode, initialValues));
  const [isSaving, setIsSaving] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(buildInitialValues(definition, mode, initialValues));
      setTestError(null);
      setIsSaving(false);
    }
  }, [open, mode, initialValues, definition]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const missingRequired = definition.credentialFields.some(field => {
    if (!field.required) {
      return false;
    }

    return !values[field.key]?.trim();
  });

  const handleConnect = async () => {
    setIsSaving(true);
    setTestError(null);
    const result = await onSave(values);
    setIsSaving(false);

    if (result.success) {
      toast.success(`${definition.name} conectado com sucesso.`);
      handleOpenChange(false);
      return;
    }

    setTestError(result.error ?? 'Não foi possível conectar.');
  };

  const hasInstructions = definition.credentialFields.some(field => field.instructionText);
  const title = mode === 'edit' ? `Atualizar ${definition.name}` : `Conectar ${definition.name}`;

  const renderCredentialsForm = () => (
    <div className="flex flex-col gap-4">
      {definition.credentialFields.map((field, index) => (
        <CredentialFieldInput
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          autoFocus={index === 0}
          onChange={value => setValues(prev => ({ ...prev, [field.key]: value }))}
        />
      ))}

      {testError && <ConnectionTestResult state="error" message={testError} />}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>

          <DialogDescription className="text-sm">
            {mode === 'edit'
              ? 'Altere os campos que deseja atualizar.'
              : 'Preencha as credenciais para conectar.'}
          </DialogDescription>
        </DialogHeader>

        {hasInstructions ? (
          <Tabs defaultValue="credentials">
            <TabsList className="w-full">
              <TabsTrigger value="credentials" className="flex-1 gap-1.5">
                Credenciais
              </TabsTrigger>

              <TabsTrigger value="instructions" className="flex-1 gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Instruções de configuração
              </TabsTrigger>
            </TabsList>

            <TabsContent value="credentials" className="mt-4">
              {renderCredentialsForm()}
            </TabsContent>

            <TabsContent value="instructions" className="mt-4">
              <div className="flex flex-col gap-2.5">
                {definition.docsUrl && (
                  <a
                    href={definition.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Documentação oficial do {definition.name}
                  </a>
                )}

                <p className="text-sm text-muted-foreground">
                  Veja abaixo onde encontrar cada informação necessária para configurar a integração.
                </p>

                {definition.credentialFields
                  .filter(field => field.instructionText)
                  .map(field => (
                    <div
                      key={field.key}
                      className="flex gap-3 rounded-lg border bg-muted/30 p-3"
                    >
                      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {field.label}
                          {field.required && <span className="ml-1 text-destructive">*</span>}
                        </p>

                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {field.instructionText}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="py-2">
            {renderCredentialsForm()}
          </div>
        )}

        <DialogFooter>
          <SubmitButton isSubmitting={isSaving} onClick={handleConnect} disabled={missingRequired || isSaving}>
            Testar e conectar
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
