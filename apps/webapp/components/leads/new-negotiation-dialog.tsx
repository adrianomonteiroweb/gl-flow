'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Receipt, Search, Truck, UserPlus, WifiOff, Zap } from 'lucide-react';

import { cpfOrCnpj } from '@workspace/utils/text';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { Input } from '@workspace/ui/components/input';
import { useIsMobile } from '@workspace/ui/hooks/use-mobile';
import { cn } from '@workspace/ui/lib/utils';

import { getClients, createNegotiationForClient } from '@/actions/clients';
import { registerNegotiationPayment, saveConsorcioSelection, sendNegotiationToApproval, simulateApproval } from '@/actions/negotiations';
import { updateLeadStepBySlug } from '@/actions/leads';
import { useOfflineSyncContext } from '@/contexts/offline-sync';
import { ClientDialogForm, type ClientDialogResult } from '@/components/clients/dialog-form';
import { ClientEditForm } from '@/components/clients/client-edit-form';
import type { ClientFormValues } from '@/components/clients/client-form-schema';
import { VehicleCatalogPicker } from '@/components/vehicle-catalog/vehicle-catalog-picker';
import type { VehicleModel } from '@/components/vehicle-catalog/types';
import { getToneClasses } from '@/lib/tone-colors';

import { StepIndicator } from './negotiation-wizard/step-indicator';
import { ProposalStep } from './negotiation-wizard/proposal-step';
import { PaymentStep, type ChargeInput } from './negotiation-wizard/payment-step';
import { ConsorcioStep } from './negotiation-wizard/consorcio-step';
import { ApprovalStep } from './negotiation-wizard/approval-step';
import { PlaceholderStep } from './negotiation-wizard/placeholder-step';
import { DOWN_PAYMENT_PCT, vehiclePriceToNumber, type ApprovalStatus, type ConsorcioPlan, type PaymentEntry, type PaymentMethod, type WizardClient, type WizardStep } from './negotiation-wizard/types';

const STEP_WIDTH: Record<WizardStep, string> = {
  client: 'sm:max-w-[500px]',
  vehicle: 'sm:max-w-[720px]',
  proposal: 'sm:max-w-[640px]',
  payment: 'sm:max-w-[920px]',
  consorcio: 'sm:max-w-[720px]',
  approval: 'sm:max-w-[680px]',
  invoicing: 'sm:max-w-[560px]',
  delivery: 'sm:max-w-[560px]',
};

interface NewNegotiationDialogProps {
  trigger?: React.ReactNode;
  initialVehicle?: VehicleModel;
  /** Cliente já conhecido: abre o fluxo direto na etapa Veículo, pulando a busca de cliente. */
  initialClient?: WizardClient;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
}

export const NewNegotiationDialog = ({ trigger, initialVehicle, initialClient, open: controlledOpen, onOpenChange: controlledOnOpenChange, onCreated }: NewNegotiationDialogProps) => {
  const { is_online, addNegotiationToQueue } = useOfflineSyncContext();
  const is_mobile = useIsMobile();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const [step, setStep] = useState<WizardStep>('client');
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<WizardClient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<WizardClient | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleModel | null>(null);
  const [pendingQuickClient, setPendingQuickClient] = useState<WizardClient | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [capturedValues, setCapturedValues] = useState<ClientFormValues | null>(null);

  // Estado do fluxo comercial (etapas 3–7).
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('idle');

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const getValuesRef = useRef<(() => ClientFormValues) | null>(null);
  const initialized_ref = useRef(false);

  useEffect(() => {
    if (open) {
      if (!initialized_ref.current) {
        initialized_ref.current = true;
        setSelectedVehicle(initialVehicle ?? null);

        if (initialClient) {
          setSelectedClient(initialClient);
          setStep('vehicle');
        }
      }
    } else {
      initialized_ref.current = false;
      setStep('client');
      setQuery('');
      setClients([]);
      setHasSearched(false);
      setIsSubmitting(false);
      setSelectedClient(null);
      setSelectedVehicle(null);
      setPendingQuickClient(null);
      setCompleteOpen(false);
      setCapturedValues(null);
      setPaymentMethod(null);
      setLeadId(null);
      setPayments([]);
      setApprovalStatus('idle');
    }
  }, [open, initialVehicle, initialClient]);

  useEffect(() => {
    if (!is_online || !open || step !== 'client') {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setClients([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const result = await getClients({ q: query.trim(), page: 1, page_size: 10 });
        setClients((result.data ?? []) as WizardClient[]);
        setHasSearched(true);
      } catch {
        toast.error('Erro ao buscar clientes.');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, is_online, open, step]);

  const isQuickLead = (client: WizardClient) => !client.document;

  const goToVehicleStep = (client: WizardClient) => {
    setSelectedClient(client);
    setStep('vehicle');
  };

  const handleSelectClient = (client: WizardClient) => {
    if (isQuickLead(client)) {
      setPendingQuickClient(client);
      return;
    }

    goToVehicleStep(client);
  };

  const handleCompleteOpenChange = (isOpen: boolean) => {
    if (!isOpen && getValuesRef.current) {
      setCapturedValues(getValuesRef.current());
    }

    setCompleteOpen(isOpen);
  };

  const handleCompleteCancel = () => {
    setCapturedValues(null);
    setFormKey(k => k + 1);
    setCompleteOpen(false);
  };

  const handleQuickClientCompleted = (saved: Record<string, any>) => {
    setCapturedValues(null);
    setFormKey(k => k + 1);
    setCompleteOpen(false);

    if (saved?.document) {
      setPendingQuickClient(null);
      goToVehicleStep({
        id: String(saved.id),
        name: String(saved.name),
        document: saved.document ?? null,
        phone: saved.phone ?? null,
        email: saved.email ?? null,
      });
      return;
    }

    toast.info('Informe o CPF/CNPJ para completar o cadastro e iniciar a negociação.');
  };

  const handleClientCreated = (result?: ClientDialogResult) => {
    setClientDialogOpen(false);

    if (!result) {
      return;
    }

    if (is_online) {
      goToVehicleStep({ id: result.id, name: result.name });
      return;
    }

    // Offline: the catalog can't be loaded, so queue the negotiation without a vehicle.
    addNegotiationToQueue(crypto.randomUUID(), {
      client_id: result.id,
      client_name: result.name,
    });

    toast.success('Negociação salva localmente. Será sincronizada ao reconectar.');
    setOpen(false);
  };

  const handleGeneratePdf = () => {
    // TODO: gerar PDF da proposta comercial (sem biblioteca de PDF no projeto ainda).
    toast.info('Geração de PDF em breve.');
  };

  const handleCreateProposal = async () => {
    if (!selectedClient || !selectedVehicle || !paymentMethod) {
      return;
    }

    // Evita criar uma segunda negociação ao voltar e avançar novamente.
    if (leadId) {
      setStep(paymentMethod === 'consorcio' ? 'consorcio' : 'payment');
      return;
    }

    setIsSubmitting(true);

    try {
      const price = vehiclePriceToNumber(selectedVehicle.price);
      const down_payment = paymentMethod === 'financiamento' ? Math.round((price * DOWN_PAYMENT_PCT) / 100) : undefined;

      const result = await createNegotiationForClient({
        client_id: selectedClient.id,
        vehicle_model_id: selectedVehicle.id,
        proposal: { payment_method: paymentMethod, total: price, down_payment },
      });

      if (!result.success) {
        toast.error(result.message ?? 'Erro ao criar proposta.');
        return;
      }

      if (!result.data?.id) {
        toast.error('Erro ao criar proposta.');
        return;
      }

      setLeadId(String(result.data.id));
      document.dispatchEvent(new Event('leads:updated'));
      setStep(paymentMethod === 'consorcio' ? 'consorcio' : 'payment');
    } catch {
      toast.error('Erro ao criar proposta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerPayment = async (input: ChargeInput, status: 'pending' | 'paid') => {
    if (!leadId || !selectedVehicle) {
      return;
    }

    setIsSubmitting(true);

    try {
      const price = vehiclePriceToNumber(selectedVehicle.price);
      const target = paymentMethod === 'financiamento' ? Math.round((price * DOWN_PAYMENT_PCT) / 100) : price;

      const result = await registerNegotiationPayment({
        lead_id: leadId,
        method: input.method,
        amount: input.amount,
        installments: input.installments,
        card_brand: input.card_brand ?? undefined,
        card_last4: input.card_last4 ?? undefined,
        status,
        target_amount: target,
      });

      if (!result.success) {
        toast.error(result.message ?? 'Erro ao registrar pagamento.');
        return;
      }

      setPayments((result.data?.payments ?? []) as PaymentEntry[]);
      document.dispatchEvent(new Event('leads:updated'));
      toast.success(status === 'paid' ? 'Pagamento registrado.' : 'Cobrança gerada.');
    } catch {
      toast.error('Erro ao registrar pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToApproval = async () => {
    if (!leadId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendNegotiationToApproval({ lead_id: leadId });

      if (!result.success) {
        toast.error(result.message ?? 'Erro ao enviar para aprovação.');
        return;
      }

      setApprovalStatus('pending');
      document.dispatchEvent(new Event('leads:updated'));
      setStep('approval');
    } catch {
      toast.error('Erro ao enviar para aprovação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitConsorcio = async (plan: ConsorcioPlan) => {
    if (!leadId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = await saveConsorcioSelection({ lead_id: leadId, selected_plan: plan, plans: [plan] });

      if (!saved.success) {
        toast.error(saved.message ?? 'Erro ao salvar consórcio.');
        return;
      }

      const approvalRes = await sendNegotiationToApproval({ lead_id: leadId });

      if (!approvalRes.success) {
        toast.error(approvalRes.message ?? 'Erro ao enviar para aprovação.');
        return;
      }

      setApprovalStatus('pending');
      document.dispatchEvent(new Event('leads:updated'));
      setStep('approval');
    } catch {
      toast.error('Erro ao enviar para aprovação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateApproval = async () => {
    if (!leadId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await simulateApproval({ lead_id: leadId });

      if (!result.success) {
        toast.error(result.message ?? 'Erro ao simular aprovação.');
        return;
      }

      setApprovalStatus('approved');
      document.dispatchEvent(new Event('leads:updated'));
      toast.success('Negociação aprovada.');
    } catch {
      toast.error('Erro ao simular aprovação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const advanceStage = async (target: WizardStep, stepSlug: string, statusSlug: string) => {
    if (!leadId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateLeadStepBySlug(leadId, stepSlug, statusSlug);

      if (!result.success) {
        toast.error(result.error ?? 'Não foi possível avançar a etapa.');
      }

      document.dispatchEvent(new Event('leads:updated'));
      setStep(target);
    } catch {
      toast.error('Não foi possível avançar a etapa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    document.dispatchEvent(new Event('leads:updated'));
    toast.success('Negociação concluída!');
    setOpen(false);
    onCreated?.();
  };

  const showEmptyState = hasSearched && clients.length === 0 && !isSearching;
  const isClientOrVehicle = step === 'client' || step === 'vehicle';
  // Sem etapa de cliente (cliente pré-selecionado), "Voltar" na etapa Veículo fecha o fluxo.
  const vehicleBackGoesToClient = step === 'vehicle' && !initialClient;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

        <DialogContent className={cn('flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0', STEP_WIDTH[step])}>
          <div className="shrink-0 space-y-2.5 px-6 pb-2 pt-4 sm:space-y-3 sm:pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2">
                <Zap className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold sm:text-lg">Nova Negociação</DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground sm:text-xs">Fluxo comercial guiado</DialogDescription>
              </div>
            </div>
            <StepIndicator step={step} />
          </div>

          <div className="min-h-0 flex-auto overflow-y-auto px-6 pb-1">

            {step === 'client' && (
              <div className="space-y-4">
                {pendingQuickClient ? (
                  <div className="space-y-4">
                    <div className={cn('flex gap-3 rounded-lg border-l-4 p-4', getToneClasses('warning').soft)}>
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-semibold">Cadastro incompleto</p>
                        <p className="text-sm">
                          <span className="font-medium">{pendingQuickClient.name}</span> precisa de CPF/CNPJ para continuar. Complete em 30 segundos.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setPendingQuickClient(null)}>
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                      </Button>
                      <Button type="button" className="flex-1 gap-2" onClick={() => setCompleteOpen(true)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Completar
                      </Button>
                    </div>
                  </div>
                ) : is_online ? (
                  <>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buscar cliente</label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome, CPF/CNPJ ou telefone..." className="h-10 pl-10" autoFocus={!is_mobile} />
                      </div>
                    </div>

                    <div className="min-h-[200px]">
                      {!query.trim() && !hasSearched && (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                          <div className="rounded-lg bg-muted p-3">
                            <Search className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="max-w-xs text-center text-sm text-muted-foreground">Digite o nome, CPF/CNPJ ou telefone para encontrar um cliente</p>
                        </div>
                      )}

                      {isSearching && (
                        <div className="flex flex-col items-center justify-center gap-2 py-12">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground">Buscando...</p>
                        </div>
                      )}

                      {!isSearching && clients.length > 0 && (
                        <div className="space-y-2 pr-2 sm:max-h-[320px] sm:overflow-y-auto">
                          {clients.map(client => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleSelectClient(client)}
                              className={cn(
                                'w-full rounded-lg border-2 p-3 text-left transition-all duration-200',
                                'border-transparent bg-muted/50 hover:border-primary hover:bg-primary/5 focus-visible:border-primary focus-visible:outline-none'
                              )}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">{client.name}</p>
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {[client.document ? cpfOrCnpj(client.document) : null, client.phone].filter(Boolean).join(' · ') || client.email || ''}
                                  </p>
                                </div>
                                {isQuickLead(client) && (
                                  <Badge variant="secondary" className={cn('shrink-0 text-xs', getToneClasses('info').soft)}>
                                    Rápido
                                  </Badge>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {showEmptyState && (
                        <div className="flex flex-col items-center justify-center gap-4 py-12">
                          <div className="rounded-lg bg-muted p-3">
                            <UserPlus className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="text-center">
                            <p className="mb-1 text-sm font-medium text-foreground">Nenhum cliente encontrado</p>
                            <p className="text-xs text-muted-foreground">Crie um novo cliente para começar</p>
                          </div>
                          <Button type="button" size="sm" className="mt-2 gap-2" onClick={() => setClientDialogOpen(true)}>
                            <UserPlus className="h-4 w-4" />
                            Criar cliente
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-12">
                    <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-950">
                      <WifiOff className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-center">
                      <p className="mb-1 text-sm font-semibold text-foreground">Sem conexão</p>
                      <p className="max-w-xs text-xs text-muted-foreground">Busca de clientes e catálogo offline não disponíveis. Crie um novo cliente.</p>
                    </div>
                    <Button type="button" className="mt-2 gap-2" onClick={() => setClientDialogOpen(true)}>
                      <UserPlus className="h-4 w-4" />
                      Criar cliente
                    </Button>
                  </div>
                )}
              </div>
            )}

            {step === 'vehicle' && (
              <div className="space-y-3">
                {selectedClient && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="font-medium text-foreground">{selectedClient.name}</span>
                  </div>
                )}

                <VehicleCatalogPicker selectedId={selectedVehicle?.id ?? null} onSelect={setSelectedVehicle} />

                {selectedVehicle && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-green-50 p-2 text-xs text-green-600 animate-in fade-in-50 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {selectedVehicle.make} {selectedVehicle.model} selecionado
                    </span>
                  </div>
                )}
              </div>
            )}

            {step === 'proposal' && selectedVehicle && (
              <ProposalStep
                vehicle={selectedVehicle}
                paymentMethod={paymentMethod}
                onSelectMethod={setPaymentMethod}
                onBack={() => setStep('vehicle')}
                onContinue={handleCreateProposal}
                onGeneratePdf={handleGeneratePdf}
                isSubmitting={isSubmitting}
              />
            )}

            {step === 'payment' && selectedVehicle && (
              <PaymentStep
                vehicle={selectedVehicle}
                clientName={selectedClient?.name ?? ''}
                paymentMethod={paymentMethod === 'financiamento' ? 'financiamento' : 'avista'}
                payments={payments}
                onBack={() => setStep('proposal')}
                onContinue={goToApproval}
                onCharge={input => registerPayment(input, 'pending')}
                onSimulate={input => registerPayment(input, 'paid')}
                isSubmitting={isSubmitting}
              />
            )}

            {step === 'consorcio' && selectedVehicle && <ConsorcioStep vehicle={selectedVehicle} onBack={() => setStep('proposal')} onSubmit={submitConsorcio} isSubmitting={isSubmitting} />}

            {step === 'approval' && (
              <ApprovalStep
                status={approvalStatus === 'approved' ? 'approved' : 'pending'}
                onBack={() => setStep(paymentMethod === 'consorcio' ? 'consorcio' : 'payment')}
                onSimulate={handleSimulateApproval}
                onContinue={() => advanceStage('invoicing', 'faturamento', 'a_faturar')}
                isSubmitting={isSubmitting}
              />
            )}

            {step === 'invoicing' && (
              <PlaceholderStep
                title="Faturamento"
                subtitle="Emissão da nota fiscal e envio automático ao Linx"
                icon={Receipt}
                message="Etapa em desenvolvimento. O conteúdo do faturamento será definido em breve."
                primaryLabel="Continuar"
                onBack={() => setStep('approval')}
                onPrimary={() => advanceStage('delivery', 'entrega', 'aguardando_transporte')}
                isSubmitting={isSubmitting}
              />
            )}

            {step === 'delivery' && (
              <PlaceholderStep
                title="Entrega"
                subtitle="Transporte e emplacamento do veículo"
                icon={Truck}
                message="Etapa em desenvolvimento. O conteúdo da entrega será definido em breve."
                primaryLabel="Concluir"
                primaryVariant="finish"
                onBack={() => setStep('invoicing')}
                onPrimary={handleFinish}
                isSubmitting={isSubmitting}
              />
            )}

          </div>

          {isClientOrVehicle && (
            <div className="shrink-0 border-t px-6 py-2 sm:py-4">
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" className="gap-1.5" onClick={() => (vehicleBackGoesToClient ? setStep('client') : setOpen(false))} disabled={isSubmitting}>
                  <ArrowLeft className="h-4 w-4" />
                  {vehicleBackGoesToClient ? 'Voltar' : 'Cancelar'}
                </Button>
                {step === 'vehicle' && (
                  <Button type="button" onClick={() => setStep('proposal')} disabled={!selectedVehicle} className="flex-1 gap-1.5 sm:flex-none">
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]">
          <ClientDialogForm onSubmit={handleClientCreated} />
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={handleCompleteOpenChange}>
        <DialogContent className="max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]">
          {pendingQuickClient && (
            <ClientEditForm
              key={formKey}
              client={pendingQuickClient}
              initialValues={capturedValues}
              onReady={fn => {
                getValuesRef.current = fn;
              }}
              onSaved={handleQuickClientCompleted}
              onCancel={handleCompleteCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
