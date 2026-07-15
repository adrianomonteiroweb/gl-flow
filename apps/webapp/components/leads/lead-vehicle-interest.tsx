'use client';

import { useEffect, useRef, useState } from 'react';
import { Car, Pencil, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { cpfOrCnpj } from '@workspace/utils/text';
import { DateFormatter } from '@workspace/utils';
import { Switch } from '@workspace/ui/components/switch';
import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent } from '@workspace/ui/components/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@workspace/ui/components/alert-dialog';

import { updateLeadVehicleInterest } from '@/actions/leads';
import { getClient } from '@/actions/clients';
import { completeLeadEnrichmentTask } from '@/actions/tasks';
import { maritalStatusLabel } from '@/lib/clients/marital-status';
import { ClientEditForm } from '@/components/clients/client-edit-form';
import { ClientDialogForm, type ClientDialogResult } from '@/components/clients/dialog-form';
import type { ClientFormValues } from '@/components/clients/client-form-schema';
import { NewNegotiationDialog } from '@/components/leads/new-negotiation-dialog';
import type { WizardClient } from '@/components/leads/negotiation-wizard/types';

interface LeadVehicleInterestProps {
  leadId: string;
  vehicleInterest: boolean;
  clientId?: string | null;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
}

interface ClientEnrichedInfoProps {
  client: Record<string, any>;
  onEdit: () => void;
}

const ClientEnrichedInfo = ({ client, onEdit }: ClientEnrichedInfoProps) => {
  const hasDocument = !!client.document;
  const hasBirthDate = !!client.birth_date;
  const hasMaritalStatus = !!client.marital_status;
  const hasPhoneSecondary = !!client.phone_secondary;

  if (!hasDocument && !hasBirthDate && !hasMaritalStatus && !hasPhoneSecondary) {
    return (
      <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
        <span className="text-xs text-muted-foreground">Dados do cliente ainda não enriquecidos</span>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
          Completar
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2.5 space-y-1.5">
      {hasDocument && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">{client.person_type === 'pj' ? 'CNPJ' : 'CPF'}</span>
          <span className="text-xs font-medium">{cpfOrCnpj(String(client.document))}</span>
        </div>
      )}
      {hasBirthDate && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">{client.person_type === 'pj' ? 'Fundação' : 'Nascimento'}</span>
          <span className="text-xs font-medium">{DateFormatter.date(client.birth_date)}</span>
        </div>
      )}
      {hasMaritalStatus && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Estado civil</span>
          <span className="text-xs font-medium">{maritalStatusLabel(client.marital_status)}</span>
        </div>
      )}
      {hasPhoneSecondary && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">WhatsApp</span>
          <span className="text-xs font-medium">{client.phone_secondary}</span>
        </div>
      )}
      <div className="pt-0.5">
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
          Editar dados do cliente
        </Button>
      </div>
    </div>
  );
};

export const LeadVehicleInterest = ({ leadId, vehicleInterest, clientId, leadName, leadEmail, leadPhone }: LeadVehicleInterestProps) => {
  const [interested, setInterested] = useState(vehicleInterest);
  const [client, setClient] = useState<Record<string, any> | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // formKey increments only on explicit cancel/save to remount the form with fresh defaults.
  const [formKey, setFormKey] = useState(0);
  // Holds form values captured when the dialog is dismissed via X/backdrop/Escape,
  // so the next open rehydrates what the user had typed.
  const [capturedValues, setCapturedValues] = useState<ClientFormValues | null>(null);
  const getValuesRef = useRef<(() => ClientFormValues) | null>(null);
  // After the client's registration is completed, offer to continue with a
  // negotiation — the wizard opens straight on the vehicle step.
  const [pendingNegotiationClient, setPendingNegotiationClient] = useState<WizardClient | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [negotiationOpen, setNegotiationOpen] = useState(false);

  useEffect(() => {
    if (!vehicleInterest || !clientId) {
      return;
    }

    getClient(clientId).then(result => {
      if (result.success && result.data) {
        setClient(result.data as Record<string, any>);
      }
    });
  }, [vehicleInterest, clientId]);

  // Opens the right registration modal for the current state. Guarantees the
  // action even when the toggle's auto-open did not fire (no linked client).
  const openRegistration = (linkedClient: Record<string, any> | null) => {
    if (linkedClient) {
      setEditOpen(true);
    } else {
      setCreateOpen(true);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setLoading(true);

    try {
      const result = await updateLeadVehicleInterest(leadId, checked);

      if (!result.success) {
        toast.error(result.error || 'Erro ao atualizar interesse em veículo');
        return;
      }

      setInterested(checked);

      if (!checked) {
        return;
      }

      const linkedClient = (result.data?.client as Record<string, any> | null) ?? null;
      setClient(linkedClient);
      openRegistration(linkedClient);
    } finally {
      setLoading(false);
    }
  };

  // Called only by Radix (X, backdrop, Escape) — NOT when we call setEditOpen(false) ourselves.
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && getValuesRef.current) {
      setCapturedValues(getValuesRef.current());
    }

    setEditOpen(isOpen);
  };

  // Offers a negotiation once the client has a document (registration completed).
  const offerNegotiation = (completedClient: Record<string, any> | null) => {
    if (!completedClient?.document) {
      return;
    }

    setPendingNegotiationClient({
      id: String(completedClient.id),
      name: String(completedClient.name),
      document: completedClient.document ?? null,
      phone: completedClient.phone ?? null,
      email: completedClient.email ?? null,
    });
    setConfirmOpen(true);
  };

  const handleSaved = (savedClient: Record<string, any>) => {
    setCapturedValues(null);
    setClient(savedClient);
    setEditOpen(false);
    setFormKey(k => k + 1);
    completeLeadEnrichmentTask(leadId);
    offerNegotiation(savedClient);
  };

  const handleCancel = () => {
    setCapturedValues(null);
    setEditOpen(false);
    setFormKey(k => k + 1);
  };

  const handleClientCreated = async (result?: ClientDialogResult) => {
    setCreateOpen(false);

    if (!result) {
      return;
    }

    const linkResult = await updateLeadVehicleInterest(leadId, true, result.id);
    const linkedClient = (linkResult.data?.client as Record<string, any> | null) ?? null;

    if (linkedClient) {
      setClient(linkedClient);
    }

    completeLeadEnrichmentTask(leadId);
    offerNegotiation(linkedClient);
  };

  const handleConfirmNegotiation = () => {
    setConfirmOpen(false);
    setNegotiationOpen(true);
  };

  return (
    <div>
      <div className="flex items-center gap-3 rounded-md border border-border px-3 py-3">
        <Car className="h-5 w-5 shrink-0 text-muted-foreground" />
        <label className="flex-1 text-xs font-medium text-muted-foreground leading-snug">Tem interesse em adquirir um veículo?</label>
        <Switch checked={interested} onCheckedChange={handleToggle} disabled={loading} aria-label="Tem interesse em adquirir um veículo?" />
      </div>

      {interested &&
        (client ? (
          <ClientEnrichedInfo client={client} onEdit={() => setEditOpen(true)} />
        ) : (
          <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Cliente ainda não cadastrado</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-3 w-3" />
              Cadastrar cliente
            </Button>
          </div>
        ))}

      <Dialog open={editOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]">
          {client && (
            <ClientEditForm
              key={formKey}
              client={client}
              initialValues={capturedValues}
              onReady={fn => {
                getValuesRef.current = fn;
              }}
              onSaved={handleSaved}
              onCancel={handleCancel}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]">
          <ClientDialogForm
            onSubmit={handleClientCreated}
            initialValues={{
              name: leadName,
              phone: leadPhone,
              email: leadEmail,
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar uma negociação?</AlertDialogTitle>
            <AlertDialogDescription>
              Cadastro de {pendingNegotiationClient?.name} concluído. Deseja seguir com uma nova negociação agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNegotiation}>Iniciar negociação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewNegotiationDialog open={negotiationOpen} onOpenChange={setNegotiationOpen} initialClient={pendingNegotiationClient ?? undefined} />
    </div>
  );
};
