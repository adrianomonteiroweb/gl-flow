'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, UserX } from 'lucide-react';
import { toast } from 'sonner';

import { formatPhoneBR } from '@workspace/utils/text';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';

import { updateClient } from '@/actions/clients';
import { getToneClasses } from '@/lib/tone-colors';
import { compareLeadWithClient, type ClientComparison } from './field-comparison';
import { ClientComparisonCard } from './client-comparison-card';
import { DivergenceResolver } from './divergence-resolver';
import { NewNegotiationDialog } from './new-negotiation-dialog';

export type MatchedClient = {
  id: string;
  name: string;
  person_type?: string | null;
  trade_name?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_secondary?: string | null;
  address?: Record<string, string> | null;
  status?: string | null;
  source?: string | null;
};

type LeadValues = {
  name: string;
  phone: string;
  email?: string;
};

type Phase = 'compare' | 'resolve' | 'confirmed';
type Resolution = 'lead' | 'existing';

interface ExistingClientMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: MatchedClient[];
  leadValues: LeadValues;
  onConfirmNotSame: () => void;
}

export const ExistingClientMatchDialog = ({ open, onOpenChange, matches, leadValues, onConfirmNotSame }: ExistingClientMatchDialogProps) => {
  const [phase, setPhase] = useState<Phase>('compare');
  const [selected_comparison, setSelectedComparison] = useState<ClientComparison | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [is_updating, setIsUpdating] = useState(false);
  const [updated_fields, setUpdatedFields] = useState<string[]>([]);
  const [negotiation_open, setNegotiationOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setPhase('compare');
      setSelectedComparison(null);
      setResolutions({});
      setIsUpdating(false);
      setUpdatedFields([]);
      setNegotiationOpen(false);
    }
  }, [open]);

  const comparisons = useMemo(() => {
    return matches.map(client => compareLeadWithClient(leadValues, client));
  }, [matches, leadValues]);

  const lead_phone = leadValues.phone ? formatPhoneBR(leadValues.phone) : '';

  const handleSelectClient = (comparison: ClientComparison) => {
    setSelectedComparison(comparison);

    if (comparison.has_divergence) {
      setResolutions({});
      setPhase('resolve');
    } else {
      setPhase('confirmed');
    }
  };

  const handleResolutionChange = (field: string, choice: Resolution) => {
    setResolutions(prev => ({ ...prev, [field]: choice }));
  };

  const handleConfirmResolve = async () => {
    if (!selected_comparison) {
      return;
    }

    const updates: Record<string, string | null> = {};
    const labels: string[] = [];

    for (const field of selected_comparison.fields) {
      if (field.status === 'divergent' && resolutions[field.field] === 'lead') {
        updates[field.field] = field.new_value;
        labels.push(field.label.toLowerCase());
      }
    }

    if (Object.keys(updates).length > 0) {
      setIsUpdating(true);

      const result = await updateClient(selected_comparison.client.id, updates);

      setIsUpdating(false);

      if (result.status !== 200) {
        toast.error(result.message ?? 'Erro ao atualizar cadastro.');
        return;
      }

      if (updates.name) {
        selected_comparison.client.name = updates.name;
      }

      if (updates.email !== undefined) {
        selected_comparison.client.email = updates.email;
      }

      if (updates.phone !== undefined) {
        selected_comparison.client.phone = updates.phone;
      }

      toast.success('Cadastro atualizado.');
      document.dispatchEvent(new Event('clients:updated'));
      setUpdatedFields(labels);
    }

    setPhase('confirmed');
  };

  const handleBackToCompare = () => {
    setPhase('compare');
    setSelectedComparison(null);
    setResolutions({});
  };

  const confirmed_client = selected_comparison?.client ?? null;

  const stable_initial_client = useRef<{ id: string; name: string; document: string | null; phone: string | null; email: string | null } | null>(null);

  if (confirmed_client && (!stable_initial_client.current || stable_initial_client.current.id !== confirmed_client.id)) {
    stable_initial_client.current = {
      id: String(confirmed_client.id),
      name: String(confirmed_client.name),
      document: confirmed_client.document ?? null,
      phone: confirmed_client.phone ?? null,
      email: confirmed_client.email ?? null,
    };
  }

  if (!confirmed_client) {
    stable_initial_client.current = null;
  }

  const dialog_title = phase === 'compare'
    ? 'Cliente já cadastrado'
    : phase === 'resolve'
      ? 'Revisar dados divergentes'
      : 'Cliente confirmado';

  const dialog_description = phase === 'compare'
    ? 'O contato informado já pertence a um cliente. Verifique se é o mesmo cliente que você está atendendo.'
    : phase === 'resolve'
      ? 'Escolha quais dados manter para cada campo com informações diferentes.'
      : 'Você pode iniciar uma nova negociação para este cliente.';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{dialog_title}</DialogTitle>
            <DialogDescription>{dialog_description}</DialogDescription>
          </DialogHeader>

          <div className={`rounded-md px-3 py-2 text-xs ${getToneClasses('info').soft}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-foreground">Novo lead:</span>
              <span>{leadValues.name}</span>
              {lead_phone ? <span>{lead_phone}</span> : null}
              {leadValues.email ? <span>{leadValues.email}</span> : null}
            </div>
          </div>

          {phase === 'compare' ? (
            <div className="space-y-4">
              <div aria-live="polite" className="sr-only">
                {comparisons.length} cliente{comparisons.length > 1 ? 's' : ''} encontrado{comparisons.length > 1 ? 's' : ''} com dados semelhantes. Revise os dados antes de prosseguir.
              </div>

              <div className="space-y-3">
                {comparisons.map(comparison => (
                  <ClientComparisonCard
                    key={comparison.client.id}
                    comparison={comparison}
                    onConfirm={() => handleSelectClient(comparison)}
                  />
                ))}
              </div>

              <DialogFooter className="flex flex-row justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <div className="flex-1" />
                <Button type="button" variant="secondary" onClick={onConfirmNotSame} className="gap-1.5">
                  <UserX className="h-4 w-4" />
                  Não, é outra pessoa
                </Button>
              </DialogFooter>
            </div>
          ) : null}

          {phase === 'resolve' && selected_comparison ? (
            <DivergenceResolver
              comparison={selected_comparison}
              resolutions={resolutions}
              onChange={handleResolutionChange}
              onConfirm={handleConfirmResolve}
              onBack={handleBackToCompare}
              is_submitting={is_updating}
            />
          ) : null}

          {phase === 'confirmed' && confirmed_client ? (
            <div className="space-y-4">
              <Alert className={getToneClasses('success').soft}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Confirmado como o mesmo cliente. Nenhum lead duplicado foi criado.
                  {updated_fields.length > 0 ? (
                    <span className="block mt-1">Dados atualizados: {updated_fields.join(', ')}.</span>
                  ) : null}
                </AlertDescription>
              </Alert>

              <div aria-live="polite" className="sr-only">
                Cliente confirmado com sucesso.{updated_fields.length > 0 ? ` Dados atualizados: ${updated_fields.join(', ')}.` : ''}
              </div>

              <DialogFooter className="flex flex-row justify-between gap-2">
                <Button type="button" variant="ghost" onClick={handleBackToCompare}>
                  Voltar
                </Button>
                <div className="flex-1" />
                <Button type="button" onClick={() => setNegotiationOpen(true)} className="gap-1.5">
                  Iniciar Nova Negociação
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {confirmed_client && stable_initial_client.current ? (
        <NewNegotiationDialog
          open={negotiation_open}
          onOpenChange={setNegotiationOpen}
          initialClient={stable_initial_client.current}
          onCreated={() => {
            document.dispatchEvent(new Event('clients:updated'));
            onOpenChange(false);
          }}
        />
      ) : null}
    </>
  );
};
