'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { User, MapPin, Info, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { createClient } from '@/actions/clients';
import { lookupAddressByZip } from '@/actions/cep';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@workspace/ui/components/dialog';
import { Label } from '@workspace/ui/components/label';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import { Button } from '@workspace/ui/components/button';
import SubmitButton from '@workspace/ui/components/submit-button';

const STEPS: any[] = [
  { title: 'Dados Pessoais', description: 'Informações básicas do cliente', icon: User },
  { title: 'Endereço', description: 'Localização do cliente', icon: MapPin },
  { title: 'Informações adicionais', description: 'Observações sobre o cliente', icon: Info },
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

const formatZip = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatPhone = (value: string): string => {
  const hasPlus = value.trim().startsWith('+');
  const digits = value.replace(/\D/g, '').slice(0, 13);

  if (digits.length === 0) return '';

  if (hasPlus || digits.length > 11) {
    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const first = digits.slice(4, 9);
    const last = digits.slice(9, 13);

    let out = `+${country}`;

    if (area) {
      out += ` (${area}`;
    }

    if (area.length === 2) {
      out += ')';
    }

    if (first) {
      out += ` ${first}`;
    }

    if (last) {
      out += `-${last}`;
    }

    return out.trim();
  }

  const area = digits.slice(0, 2);
  const middleLen = digits.length > 10 ? 5 : 4;
  const middle = digits.slice(2, 2 + middleLen);
  const last = digits.slice(2 + middleLen);
  let out = '';

  if (area) {
    out += `(${area}`;
  }

  if (area.length === 2) {
    out += ')';
  }

  if (middle) {
    out += ` ${middle}`;
  }

  if (last) {
    out += `-${last}`;
  }

  return out.trim();
};

type AddressState = {
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export function ClientDialogForm({ onSubmit = () => {} }: { onSubmit?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [address, setAddress] = useState<AddressState>({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  const [lossReason, setLossReason] = useState('');

  const [isZipLoading, setIsZipLoading] = useState(false);
  const lastFetchedZipRef = useRef<string>('');

  const isLastStep = currentStep === STEPS.length - 1;

  useEffect(() => {
    const digits = address.zipCode.replace(/\D/g, '');

    if (digits.length !== 8) {
      return;
    }

    if (digits === lastFetchedZipRef.current) {
      return;
    }

    lastFetchedZipRef.current = digits;

    let cancelled = false;

    const run = async (): Promise<void> => {
      setIsZipLoading(true);
      try {
        const result = await lookupAddressByZip(digits);

        if (cancelled) {
          return;
        }

        if (!result) {
          toast.error('CEP não encontrado.');
          return;
        }

        setAddress(prev => ({
          ...prev,
          street: prev.street || result.street,
          neighborhood: prev.neighborhood || result.neighborhood,
          city: prev.city || result.city,
          state: prev.state || result.state,
        }));
      } finally {
        if (!cancelled) {
          setIsZipLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [address.zipCode]);

  const updateAddress = (patch: Partial<AddressState>): void => {
    setAddress(prev => ({ ...prev, ...patch }));
  };

  const validateStep = (): boolean => {
    if (currentStep === 0) {
      if (!name.trim()) {
        toast.error('Nome é obrigatório.');
        return false;
      }

      if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
        toast.error('E-mail inválido.');
        return false;
      }

      if (phone.trim() && !PHONE_REGEX.test(phone.trim())) {
        toast.error('Telefone inválido.');
        return false;
      }

      return true;
    }

    if (currentStep === 1) {
      const zipDigits = address.zipCode.replace(/\D/g, '');

      if (zipDigits && zipDigits.length !== 8) {
        toast.error('CEP deve ter 8 dígitos.');
        return false;
      }

      if (address.state && !/^[A-Z]{2}$/.test(address.state)) {
        toast.error('Estado deve ter 2 letras (ex: SP).');
        return false;
      }

      return true;
    }

    return true;
  };

  const handleNext = (): void => {
    if (!validateStep()) {
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = (): void => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateStep()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const zipDigits = address.zipCode.replace(/\D/g, '');

      const clientData = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        loss_reason: lossReason || undefined,
        address: {
          zipCode: zipDigits || undefined,
          street: address.street || undefined,
          number: address.number || undefined,
          complement: address.complement || undefined,
          neighborhood: address.neighborhood || undefined,
          city: address.city || undefined,
          state: address.state || undefined,
        },
      };

      const result = await createClient(clientData);

      if (result?.status !== 200) {
        toast.error(result?.message ?? 'Ocorreu um erro ao criar o cliente.');
        return;
      }

      toast.success('Cliente criado com sucesso.');
      onSubmit();
      document.dispatchEvent(new Event('clients:updated'));
    } catch (error) {
      console.error(error);
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepIcon = STEPS[currentStep].icon;

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Novo Cliente</DialogTitle>
        <DialogDescription>
          Passo {currentStep + 1} de {STEPS.length}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-2 mt-4 mb-6">
        {STEPS.map((step, index) => (
          <div key={step.title} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold shrink-0 ${
                index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-400'
              }`}>
              {index + 1}
            </div>
            <span className={`text-sm hidden sm:block truncate ${index === currentStep ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
              {step.title}
            </span>
            {index < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 min-w-4" />}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-gray-50">
        <StepIcon className="h-4 w-4 text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-700">{STEPS[currentStep].title}</p>
          <p className="text-xs text-gray-500">{STEPS[currentStep].description}</p>
        </div>
      </div>

      <div className="min-h-[240px]">
        {currentStep === 0 && (
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name-input">Nome *</Label>
              <Input id="name-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João da Silva" autoFocus />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email-input">E-mail</Label>
              <Input id="email-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: nome@email.com" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone-input">Telefone</Label>
              <Input id="phone-input" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Ex: (11) 99999-9999" />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="zipCode-input">CEP</Label>
                <div className="relative">
                  <Input
                    id="zipCode-input"
                    value={address.zipCode}
                    onChange={e => updateAddress({ zipCode: formatZip(e.target.value) })}
                    placeholder="Ex: 01001-000"
                    autoFocus
                  />
                  {isZipLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="state-input">Estado</Label>
                <Input
                  id="state-input"
                  value={address.state}
                  onChange={e => updateAddress({ state: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="Ex: SP"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="city-input">Cidade</Label>
              <Input id="city-input" value={address.city} onChange={e => updateAddress({ city: e.target.value })} placeholder="Ex: São Paulo" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="neighborhood-input">Bairro</Label>
              <Input
                id="neighborhood-input"
                value={address.neighborhood}
                onChange={e => updateAddress({ neighborhood: e.target.value })}
                placeholder="Ex: Centro"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2 col-span-2">
                <Label htmlFor="street-input">Logradouro</Label>
                <Input
                  id="street-input"
                  value={address.street}
                  onChange={e => updateAddress({ street: e.target.value })}
                  placeholder="Ex: Rua das Flores"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="number-input">Número</Label>
                <Input id="number-input" value={address.number} onChange={e => updateAddress({ number: e.target.value })} placeholder="Ex: 123" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="complement-input">Complemento</Label>
              <Input
                id="complement-input"
                value={address.complement}
                onChange={e => updateAddress({ complement: e.target.value })}
                placeholder="Ex: Apto 101"
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="loss-reason-input">Motivo de perda</Label>
              <Textarea
                id="loss-reason-input"
                value={lossReason}
                onChange={e => setLossReason(e.target.value.slice(0, 500))}
                placeholder="Descreva o motivo de perda..."
                className="min-h-[120px] resize-none"
                maxLength={500}
                autoFocus
              />
              <p className="text-xs text-gray-400 text-right">{lossReason.length}/500</p>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="mt-6 flex items-center gap-2">
        {currentStep > 0 && (
          <Button type="button" variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        )}
        <div className="flex-1" />
        {isLastStep ? (
          <SubmitButton isSubmitting={isSubmitting} onClick={handleSubmit}>
            Salvar
          </SubmitButton>
        ) : (
          <Button type="button" onClick={handleNext}>
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
