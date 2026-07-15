import { AlertTriangle, Building2, CheckCircle2, User } from 'lucide-react';

import { cpfOrCnpj, formatPhoneBR, formatCep } from '@workspace/utils/text';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';

import { getToneClasses } from '@/lib/tone-colors';
import type { ClientComparison } from './field-comparison';
import { FieldComparisonRow } from './field-comparison-row';

const SOURCE_LABELS: Record<string, { label: string; tone: 'info' | 'neutral' }> = {
  integration: { label: 'Importado', tone: 'info' },
  lead: { label: 'Cadastro manual', tone: 'neutral' },
};

const formatAddress = (address?: Record<string, string> | null): string => {
  if (!address) {
    return '';
  }

  const parts = [
    [address.street, address.number].filter(Boolean).join(', '),
    address.complement,
    address.neighborhood,
    [address.city, address.state].filter(Boolean).join(' - '),
    address.zipCode ? formatCep(address.zipCode) : '',
  ].filter(Boolean);

  return parts.join(' · ');
};

interface ClientComparisonCardProps {
  comparison: ClientComparison;
  onConfirm: () => void;
}

export const ClientComparisonCard = ({ comparison, onConfirm }: ClientComparisonCardProps) => {
  const { client, fields, has_divergence, divergent_count } = comparison;
  const is_pj = client.person_type === 'pj';
  const address = formatAddress(client.address);
  const source_config = SOURCE_LABELS[client.source ?? ''];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2">
        {is_pj ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-semibold text-foreground">{client.name}</span>
        <Badge variant="secondary" className="text-xs">
          {is_pj ? 'Pessoa Jurídica' : 'Pessoa Física'}
        </Badge>
        {source_config ? (
          <Badge className={cn('ml-auto text-xs', getToneClasses(source_config.tone).soft)}>{source_config.label}</Badge>
        ) : null}
      </div>

      <div className="space-y-0.5" role="table" aria-label="Comparação de campos">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-3 px-3 py-1" role="row">
          <div role="columnheader" className="invisible text-xs">Campo</div>
          <div role="columnheader" className="text-xs font-medium text-muted-foreground">Novo lead</div>
          <div role="columnheader" className="text-xs font-medium text-muted-foreground">Cadastro existente</div>
        </div>
        {fields.map(field => (
          <FieldComparisonRow
            key={field.field}
            comparison={field}
            format_value={field.field === 'phone' ? v => formatPhoneBR(v) ?? v : undefined}
          />
        ))}
      </div>

      {client.document ? (
        <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">{is_pj ? 'CNPJ' : 'CPF'}</span>
          <span>{cpfOrCnpj(client.document)}</span>
        </div>
      ) : null}

      {address ? (
        <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">Endereço</span>
          <span>{address}</span>
        </div>
      ) : null}

      {has_divergence ? (
        <p className="px-3 text-xs text-amber-700 dark:text-amber-400">
          Atenção: {divergent_count} campo{divergent_count > 1 ? 's' : ''} com dados diferentes. Revise antes de confirmar.
        </p>
      ) : null}

      <div className="flex justify-end pt-1">
        {has_divergence ? (
          <Button
            type="button"
            size="sm"
            className={cn('gap-1.5', getToneClasses('warning').softHover)}
            onClick={onConfirm}
          >
            <AlertTriangle className="h-4 w-4" />
            Sim, é este cliente ({divergent_count} {divergent_count > 1 ? 'diferenças' : 'diferença'})
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onConfirm}>
            <CheckCircle2 className="h-4 w-4" />
            Sim, é este cliente
          </Button>
        )}
      </div>
    </div>
  );
};
