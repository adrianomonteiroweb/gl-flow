'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Landmark, Loader2, QrCode } from 'lucide-react';

import { formatCurrency, onlyNumbers } from '@workspace/utils/text';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { cn } from '@workspace/ui/lib/utils';

import { formatCurrencyInput, parseCurrencyInput } from '@/lib/vehicles/currency-mask';
import { formatModelYear } from '@/lib/vehicles/segments';
import type { VehicleModel } from '@/components/vehicle-catalog/types';

import { SelectableCard } from './selectable-card';
import { ProposalSummary, type SummaryRow } from './proposal-summary';
import { DOWN_PAYMENT_PCT, MAX_INSTALLMENTS, vehiclePriceToNumber, type PaymentChannel, type PaymentEntry } from './types';

export type ChargeInput = {
  method: PaymentChannel;
  amount: number;
  installments: number;
  card_brand: string | null;
  card_last4: string | null;
};

interface PaymentStepProps {
  vehicle: VehicleModel;
  clientName: string;
  paymentMethod: 'avista' | 'financiamento';
  payments: PaymentEntry[];
  onBack: () => void;
  onContinue: () => void;
  onCharge: (input: ChargeInput) => Promise<void>;
  onSimulate: (input: ChargeInput) => Promise<void>;
  isSubmitting: boolean;
}

const CHANNELS: { value: PaymentChannel; title: string; subtitle: string; icon: typeof QrCode }[] = [
  { value: 'pix', title: 'PIX', subtitle: 'Instantâneo', icon: QrCode },
  { value: 'card', title: 'Cartão', subtitle: 'Crédito / Débito', icon: CreditCard },
  { value: 'transfer', title: 'Transferência', subtitle: 'TED / DOC', icon: Landmark },
];

const CARD_BRANDS = ['VISA', 'MASTERCARD', 'ELO', 'AMEX'];

const CHANNEL_META: Record<PaymentChannel, { icon: typeof QrCode; label: string }> = {
  pix: { icon: QrCode, label: 'PIX' },
  card: { icon: CreditCard, label: 'Cartão crédito' },
  transfer: { icon: Landmark, label: 'Transferência' },
};

const formatCardNumber = (raw: string): string =>
  onlyNumbers(raw)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

const formatExpiry = (raw: string): string =>
  onlyNumbers(raw)
    .slice(0, 4)
    .replace(/(\d{2})(?=\d)/, '$1/');

export const PaymentStep = ({
  vehicle,
  clientName,
  paymentMethod,
  payments,
  onBack,
  onContinue,
  onCharge,
  onSimulate,
  isSubmitting,
}: PaymentStepProps) => {
  const [channel, setChannel] = useState<PaymentChannel>('card');
  const [cardBrand, setCardBrand] = useState('VISA');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);
  const [amountInput, setAmountInput] = useState('');

  const price = vehiclePriceToNumber(vehicle.price);
  const downPayment = Math.round((price * DOWN_PAYMENT_PCT) / 100);
  const target = paymentMethod === 'financiamento' ? downPayment : price;

  const paidTotal = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(target - paidTotal, 0);
  const amount = parseCurrencyInput(amountInput) || remaining;
  const progress = target > 0 ? Math.min((paidTotal / target) * 100, 100) : 0;

  const buildInput = (): ChargeInput => {
    const digits = onlyNumbers(cardNumber);

    return {
      method: channel,
      amount,
      installments,
      card_brand: channel === 'card' ? cardBrand : null,
      card_last4: channel === 'card' && digits.length >= 4 ? digits.slice(-4) : null,
    };
  };

  const rows: SummaryRow[] = [
    {
      label: 'Veículo',
      value: (
        <>
          <span className="font-medium">{vehicle.model}</span> {formatModelYear(vehicle)}
        </>
      ),
    },
    { label: 'Preço tabela', value: formatCurrency(price) },
  ];

  if (paymentMethod === 'financiamento') {
    rows.push({ label: `Entrada (${DOWN_PAYMENT_PCT}%)`, value: formatCurrency(downPayment), strong: true });
    rows.push({ label: 'Saldo a financiar', value: formatCurrency(price - downPayment) });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coluna de cobrança */}
        <div className="space-y-4">
          <div className="rounded-xl bg-neutral-900 p-4 text-center text-neutral-50 dark:bg-neutral-800">
            <p className="text-xs text-neutral-400">{paymentMethod === 'financiamento' ? `Entrada (${DOWN_PAYMENT_PCT}%)` : 'Valor Total'}</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(target)}</p>
            <p className="mt-1 text-xs text-neutral-400">
              {vehicle.model} · {clientName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {CHANNELS.map(item => (
              <SelectableCard
                key={item.value}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                selected={channel === item.value}
                onSelect={() => setChannel(item.value)}
              />
            ))}
          </div>

          {channel === 'card' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados do Cartão</p>
              <div className="flex flex-wrap gap-2">
                {CARD_BRANDS.map(brand => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setCardBrand(brand)}
                    aria-pressed={cardBrand === brand}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      cardBrand === brand ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                    )}>
                    {brand}
                  </button>
                ))}
              </div>
              <Input
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Input
                  placeholder="NOME NO CARTÃO"
                  value={cardName}
                  onChange={e => setCardName(e.target.value.toUpperCase())}
                  className="col-span-2 sm:col-span-1"
                />
                <Input inputMode="numeric" placeholder="MM/AA" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} />
                <Input inputMode="numeric" placeholder="CVV" value={cardCvv} onChange={e => setCardCvv(onlyNumbers(e.target.value).slice(0, 4))} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valor a cobrar</label>
            <Input
              inputMode="numeric"
              placeholder={formatCurrency(remaining)}
              value={amountInput}
              onChange={e => setAmountInput(formatCurrencyInput(e.target.value))}
            />
          </div>

          {channel === 'card' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parcelas</label>
              <select
                value={installments}
                onChange={e => setInstallments(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    {n}x de {formatCurrency(amount / n)} (sem juros)
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            type="button"
            onClick={() => onCharge(buildInput())}
            disabled={amount <= 0 || isSubmitting}
            className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Cobrar {formatCurrency(amount)}
          </Button>
        </div>

        {/* Coluna de detalhes */}
        <div className="space-y-4">
          <ProposalSummary
            title="Detalhes da Cobrança"
            rows={rows}
            total={paymentMethod === 'avista' ? { label: 'Total a pagar', value: formatCurrency(target) } : undefined}
          />

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Histórico de Pagamentos</p>
            {payments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Nenhum pagamento registrado ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {payments.map(entry => {
                  const Meta = CHANNEL_META[entry.method];
                  const Icon = Meta.icon;
                  const paid = entry.status === 'paid';

                  return (
                    <li key={entry.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {Meta.label}
                          {entry.card_brand ? ` (${entry.card_brand} ****${entry.card_last4 ?? '••••'})` : ''}
                          {paid ? ' recebido' : ' pendente'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {entry.installments > 1 ? ` · ${entry.installments}x sem juros` : ''}
                        </p>
                      </div>
                      <span
                        className={cn('shrink-0 text-sm font-semibold', paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                        + {formatCurrency(entry.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Pago</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidTotal)}</span>
            </div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Restante</span>
              <span className="font-semibold text-primary">{formatCurrency(remaining)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-600" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 mt-4 flex flex-wrap gap-1.5 border-t bg-background px-6 py-2 sm:static sm:mt-6 sm:flex-nowrap sm:gap-2 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} className="flex-1 gap-1.5 sm:flex-none">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onSimulate(buildInput())}
          disabled={amount <= 0 || isSubmitting}
          className="flex-1 gap-1.5 sm:flex-none">
          <CheckCircle2 className="h-4 w-4" />
          Simular Pagamento
        </Button>
        <Button type="button" onClick={onContinue} disabled={isSubmitting} className="flex-1 gap-1.5 sm:flex-none">
          Continuar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
