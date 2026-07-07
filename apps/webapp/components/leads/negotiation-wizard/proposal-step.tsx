'use client';

import { ArrowLeft, ArrowRight, Banknote, FileText, Landmark, Loader2 } from 'lucide-react';

import { formatCurrency } from '@workspace/utils/text';
import { Button } from '@workspace/ui/components/button';

import { formatModelYear } from '@/lib/vehicles/segments';
import type { VehicleModel } from '@/components/vehicle-catalog/types';

import { SelectableCard } from './selectable-card';
import { ProposalSummary, type SummaryRow } from './proposal-summary';
import { DOWN_PAYMENT_PCT, vehiclePriceToNumber, type PaymentMethod } from './types';

const METHODS: { value: PaymentMethod; title: string; subtitle: string; icon: typeof Banknote }[] = [
  { value: 'avista', title: 'À Vista', subtitle: 'Pagamento integral', icon: Banknote },
  { value: 'financiamento', title: 'Financiamento', subtitle: 'Via Fandi · 7 bancos', icon: Landmark },
  { value: 'consorcio', title: 'Consórcio', subtitle: 'Via IHS Honda', icon: FileText },
];

interface ProposalStepProps {
  vehicle: VehicleModel;
  paymentMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  onBack: () => void;
  onContinue: () => void;
  onGeneratePdf: () => void;
  isSubmitting: boolean;
}

export const ProposalStep = ({ vehicle, paymentMethod, onSelectMethod, onBack, onContinue, onGeneratePdf, isSubmitting }: ProposalStepProps) => {
  const price = vehiclePriceToNumber(vehicle.price);
  const year = formatModelYear(vehicle);

  const rows: SummaryRow[] = [
    {
      label: 'Veículo',
      value: (
        <>
          <span className="font-medium">{vehicle.model}</span> {year}
        </>
      ),
    },
    { label: 'Preço tabela', value: formatCurrency(price) },
  ];

  if (paymentMethod === 'financiamento') {
    const downPayment = Math.round((price * DOWN_PAYMENT_PCT) / 100);
    rows.push({ label: `Entrada (${DOWN_PAYMENT_PCT}%)`, value: formatCurrency(downPayment) });
    rows.push({ label: 'Saldo a financiar', value: formatCurrency(price - downPayment) });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Forma de Pagamento</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {METHODS.map(method => (
            <SelectableCard
              key={method.value}
              icon={method.icon}
              title={method.title}
              subtitle={method.subtitle}
              selected={paymentMethod === method.value}
              onSelect={() => onSelectMethod(method.value)}
            />
          ))}
        </div>
      </div>

      <ProposalSummary title="Resumo da Proposta" rows={rows} total={{ label: 'Total', value: formatCurrency(price) }} />

      <div className="sticky bottom-0 z-10 -mx-6 mt-4 flex flex-wrap gap-1.5 border-t bg-background px-6 py-2 sm:static sm:mt-6 sm:flex-nowrap sm:gap-2 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} className="flex-1 gap-1.5 sm:flex-none">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button type="button" variant="outline" onClick={onGeneratePdf} disabled={isSubmitting} className="flex-1 gap-1.5 sm:flex-none">
          <FileText className="h-4 w-4" />
          Gerar PDF
        </Button>
        <Button type="button" onClick={onContinue} disabled={!paymentMethod || isSubmitting} className="flex-1 gap-1.5 sm:flex-none">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
