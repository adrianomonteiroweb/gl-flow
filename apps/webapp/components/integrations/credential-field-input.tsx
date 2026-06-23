'use client';

import { Wand2 } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { PasswordInput } from '@workspace/ui/components/password-input';
import type { CredentialField } from '@/lib/integrations/registry';

type Props = {
  field: CredentialField;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
};

const generateHexToken = (bytes: number): string => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
};

export const CredentialFieldInput = ({ field, value, onChange, autoFocus }: Props) => {
  const inputId = `cred-${field.key}`;

  const handleGenerate = () => {
    if (!field.generate) {
      return;
    }

    onChange(generateHexToken(field.generate.bytes));
  };

  const renderInput = () => {
    if (field.type === 'password') {
      return (
        <PasswordInput
          id={inputId}
          value={value}
          autoComplete="new-password"
          autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    return (
      <Input
        id={inputId}
        type={field.type === 'url' ? 'url' : 'text'}
        inputMode={field.type === 'url' ? 'url' : 'text'}
        value={value}
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
      />
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId} className="text-sm">
        {field.label}
        {field.required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>

      {renderInput()}

      {field.generate && (
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit gap-1.5"
            onClick={handleGenerate}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Gerar token automaticamente
          </Button>

          {field.generate.helpText && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {field.generate.helpText}
            </p>
          )}
        </div>
      )}

      {field.helpText && !field.generate?.helpText && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  );
};
