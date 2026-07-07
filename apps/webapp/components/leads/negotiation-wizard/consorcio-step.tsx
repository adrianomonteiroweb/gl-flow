'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

import { formatCurrency } from '@workspace/utils/text';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { cn } from '@workspace/ui/lib/utils';

import { getToneClasses } from '@/lib/tone-colors';
import type { VehicleModel } from '@/components/vehicle-catalog/types';

import { WizardFooter } from './wizard-footer';
import { vehiclePriceToNumber, type ConsorcioPlan } from './types';

// Cotação simulada — substituir pela integração real com a IHS (Honda).
const buildPlans = (price: number): ConsorcioPlan[] => {
  const base = Math.max(Math.round(price / 1000) * 1000, 5000);
  const premiumCredit = Math.round((base * 1.45) / 1000) * 1000;

  return [
    { id: 'standard', name: 'Consórcio Honda', credit: base, installment: Math.round(base / 53), term: 60, status: 'pre_approved' },
    { id: 'premium', name: 'Consórcio Honda Premium', credit: premiumCredit, installment: Math.round(premiumCredit / 66), term: 72, status: 'simulating' },
  ];
};

interface ConsorcioStepProps {
  vehicle: VehicleModel;
  onBack: () => void;
  onSubmit: (plan: ConsorcioPlan) => Promise<void>;
  isSubmitting: boolean;
}

export const ConsorcioStep = ({ vehicle, onBack, onSubmit, isSubmitting }: ConsorcioStepProps) => {
  const [consulting, setConsulting] = useState(true);
  const [plans, setPlans] = useState<ConsorcioPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const price = vehiclePriceToNumber(vehicle.price);
    const timer = setTimeout(() => {
      setPlans(buildPlans(price));
      setConsulting(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [vehicle.price]);

  const selected = plans.find(plan => plan.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Consórcio Honda (IHS)</h3>
        <p className="text-sm text-muted-foreground">Simulação via integração direta com IHS</p>
      </div>

      {consulting ? (
        <Badge variant="secondary" className={cn('gap-1.5', getToneClasses('info').soft)}>
          <Loader2 className="h-3 w-3 animate-spin" />
          Consultando IHS...
        </Badge>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plans.map(plan => {
            const isSelected = selectedId === plan.id;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                aria-pressed={isSelected}
                className={cn(
                  'rounded-xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'
                )}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                  <Badge variant="secondary" className={cn('text-[10px]', getToneClasses(plan.status === 'pre_approved' ? 'success' : 'warning').soft)}>
                    {plan.status === 'pre_approved' ? 'Pré-aprovado' : 'Simulando'}
                  </Badge>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Crédito</dt>
                    <dd className="font-semibold text-foreground">{formatCurrency(plan.credit)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Parcela</dt>
                    <dd className="font-semibold text-foreground">{formatCurrency(plan.installment)}/mês</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Prazo</dt>
                    <dd className="font-semibold text-foreground">{plan.term} meses</dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>
      )}

      <WizardFooter
        left={
          <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
        right={
          <Button type="button" onClick={() => selected && onSubmit(selected)} disabled={!selected || isSubmitting} className="gap-1.5">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enviar para Aprovação
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
};
