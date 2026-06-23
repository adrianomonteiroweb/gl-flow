'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, ChevronLeft, ChevronRight, LogIn, MapPin } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import SubmitButton from '@workspace/ui/components/submit-button';
import { onlyNumbers } from '@workspace/utils/text';
import type { CompanyProfile } from '@/lib/company/profile';

import { useCompanyProfileForm } from './use-company-profile-form';
import { CnpjLookupInput, CompanyAddressFields, CompanyIdentityFields } from './company-fields';

const STEPS = [
  { title: 'Identificação', description: 'CNPJ e dados da empresa', icon: Building2 },
  { title: 'Endereço', description: 'Localização da prestadora', icon: MapPin },
] as const;

type OnboardingWizardProps = {
  initial: Partial<CompanyProfile> | null;

  onComplete?: () => void | Promise<void>;
  onCancel?: () => void;
  embedded?: boolean;
};

export const OnboardingWizard = ({ initial, onComplete, onCancel, embedded = false }: OnboardingWizardProps) => {
  const router = useRouter();
  const form = useCompanyProfileForm(initial);
  const [currentStep, setCurrentStep] = useState(0);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLastStep = currentStep === STEPS.length - 1;
  const currentStepDefinition = STEPS[currentStep] ?? STEPS[0];
  const StepIcon = currentStepDefinition.icon;

  const hasMinimumData = onlyNumbers(form.company.cnpj).length === 14 && form.company.razaoSocial.trim().length > 0;

  useEffect(() => {
    if (form.lookupDoneCount > 0 && currentStep === 0 && hasMinimumData) {
      autoAdvanceTimer.current = setTimeout(() => setCurrentStep(1), 600);
    }

    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, [form.lookupDoneCount]);

  const validateIdentification = (): boolean => {
    if (onlyNumbers(form.company.cnpj).length !== 14) {
      toast.error('Informe um CNPJ valido com 14 digitos.');
      return false;
    }

    if (form.cnpjConflict) {
      toast.error('Este CNPJ já está cadastrado em outra conta. Faça login para acessar.');
      return false;
    }

    if (!form.company.razaoSocial.trim()) {
      toast.error('Razao social e obrigatoria.');
      return false;
    }

    return true;
  };

  const handleNext = (): void => {
    if (!validateIdentification()) {
      return;
    }

    form.saveDraft();

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = (): void => {
    setCurrentStep(prev => prev - 1);
  };

  const finish = async (): Promise<void> => {
    if (onComplete) {
      await onComplete();
      return;
    }

    router.replace('/leads');
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateIdentification()) {
      return;
    }

    const saved = await form.save();

    if (saved) {
      await finish();
    }
  };

  const handleSkip = async (): Promise<void> => {
    if (!validateIdentification()) {
      return;
    }

    const saved = await form.save();

    if (saved) {
      await finish();
    }
  };

  return (
    <div className={embedded ? 'flex w-full flex-col gap-4 sm:gap-5' : 'mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-5 px-4 py-10'}>
      {!embedded && (
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Configuração da empresa</h2>
          <p className="text-sm text-muted-foreground">
            Preencha o essencial para começar — logo, cores e dados complementares podem ser configurados depois.
          </p>
        </div>
      )}

      {/* Compact sub-step header — a single master stepper lives in the orchestrator,
          so here we only orient within the company step (no duplicate stepper). */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <StepIcon className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">{currentStepDefinition.title}</span>
            <span className="text-xs text-muted-foreground">{currentStepDefinition.description}</span>
          </div>
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          Etapa {currentStep + 1} de {STEPS.length}
        </span>
      </div>

      <div>
        {currentStep === 0 && (
          <div className="flex flex-col gap-6">
            <CnpjLookupInput value={form.company.cnpj} onChange={form.setCnpj} onLookup={form.lookup} isLoading={form.isCnpjLoading} conflict={form.cnpjConflict} onGoToLogin={form.goToLogin} autoFocus />
            <CompanyIdentityFields company={form.company} setField={form.setField} />
          </div>
        )}

        {currentStep === 1 && <CompanyAddressFields company={form.company} setField={form.setField} />}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onCancel}>
              <LogIn className="h-4 w-4" />
              Voltar ao login
            </Button>
          )}
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          )}
        </div>
        <div className="hidden flex-1 sm:block" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {currentStep === 0 && hasMinimumData && (
            <Button type="button" variant="ghost" className="w-full text-muted-foreground sm:w-auto" onClick={handleSkip} disabled={form.isSaving}>
              Configurar depois
            </Button>
          )}
          {isLastStep ? (
            <SubmitButton isSubmitting={form.isSaving} onClick={handleSubmit} className="w-full sm:w-auto">
              Concluir
            </SubmitButton>
          ) : (
            <Button type="button" onClick={handleNext} className="w-full sm:w-auto">
              Proximo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
