'use client';

import { useMemo } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';

import { formatPhoneBR } from '@workspace/utils/text';
import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import { SubmitButton } from '@workspace/ui/components/submit-button';

import type { ClientComparison, FieldComparison } from './field-comparison';

type Resolution = 'lead' | 'existing';

interface DivergenceResolverProps {
  comparison: ClientComparison;
  resolutions: Record<string, Resolution>;
  onChange: (field: string, choice: Resolution) => void;
  onConfirm: () => void;
  onBack: () => void;
  is_submitting: boolean;
}

const formatValue = (field: FieldComparison): { new_display: string; existing_display: string } => {
  const format = field.field === 'phone' ? (v: string) => formatPhoneBR(v) ?? v : (v: string) => v;

  return {
    new_display: field.new_value ? format(field.new_value) : 'Sem dados',
    existing_display: field.existing_value ? format(field.existing_value) : 'Sem dados',
  };
};

export const DivergenceResolver = ({ comparison, resolutions, onChange, onConfirm, onBack, is_submitting }: DivergenceResolverProps) => {
  const divergent_fields = comparison.fields.filter(f => f.status === 'divergent');

  const all_resolved = divergent_fields.every(f => resolutions[f.field] !== undefined);

  const update_count = useMemo(() => {
    return divergent_fields.filter(f => resolutions[f.field] === 'lead').length;
  }, [divergent_fields, resolutions]);

  const button_label = update_count > 0
    ? `Confirmar e Atualizar ${update_count} Campo${update_count > 1 ? 's' : ''}`
    : 'Confirmar sem Alterar';

  return (
    <div className="space-y-4">
      <div aria-live="polite" className="sr-only">
        Escolha quais dados manter para {divergent_fields.length} campo{divergent_fields.length > 1 ? 's' : ''} divergente{divergent_fields.length > 1 ? 's' : ''}.
      </div>

      <p className="text-sm text-muted-foreground">
        Escolha quais dados manter para cada campo com informações diferentes:
      </p>

      <div className="space-y-5">
        {divergent_fields.map(field => {
          const { new_display, existing_display } = formatValue(field);

          return (
            <fieldset key={field.field} className="space-y-2">
              <legend className="text-sm font-medium text-foreground">{field.label}</legend>
              <RadioGroup
                value={resolutions[field.field] ?? ''}
                onValueChange={v => onChange(field.field, v as Resolution)}
                className="gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="existing" id={`${field.field}-existing`} />
                  <Label htmlFor={`${field.field}-existing`} className="text-sm font-normal">
                    Manter existente: <span className="font-medium">{existing_display}</span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="lead" id={`${field.field}-lead`} />
                  <Label htmlFor={`${field.field}-lead`} className="text-sm font-normal">
                    Atualizar para: <span className="font-medium">{new_display}</span>
                  </Label>
                </div>
              </RadioGroup>
            </fieldset>
          );
        })}
      </div>

      {update_count > 0 ? (
        <p className="text-xs text-muted-foreground">
          {update_count} campo{update_count > 1 ? 's serão atualizados' : ' será atualizado'} no cadastro do cliente.
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <SubmitButton isSubmitting={is_submitting} disabled={!all_resolved} onClick={onConfirm} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          {button_label}
        </SubmitButton>
      </div>
    </div>
  );
};
