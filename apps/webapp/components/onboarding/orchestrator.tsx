'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

import { Card } from '@workspace/ui/components/card';
import { Separator } from '@workspace/ui/components/separator';

import { OnboardingWizard } from '@/components/company/onboarding-wizard';
import { cancelOnboarding, updateOnboardingStep } from '@/actions/onboarding';
import { isStepResolved, type OnboardingState, type OnboardingStepKey, type OnboardingStepStatus } from '@/lib/onboarding/state';
import type { CompanyProfile } from '@/lib/company/profile';

import { ChannelOnboardingStep } from './channel-step';
import { TeamOnboardingStep } from './team-step';

const PHASES: { key: OnboardingStepKey; label: string }[] = [
  { key: 'company', label: 'Empresa' },
  { key: 'channel', label: 'Canais' },
  { key: 'team', label: 'Times' },
];

const firstUnresolvedIndex = (state: OnboardingState): number => PHASES.findIndex(phase => !isStepResolved(state[phase.key]));

type Props = {
  initialCompany: Partial<CompanyProfile> | null;
  initialState: OnboardingState;
};

export const OnboardingOrchestrator = ({ initialCompany, initialState }: Props) => {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(initialState);

  const initialIndex = firstUnresolvedIndex(initialState);
  const [phaseIndex, setPhaseIndex] = useState(initialIndex === -1 ? PHASES.length : initialIndex);

  useEffect(() => {
    if (phaseIndex >= PHASES.length) {
      router.replace('/leads');
    }
  }, [phaseIndex, router]);

  const advance = async (step: OnboardingStepKey, status: OnboardingStepStatus): Promise<void> => {
    const result = await updateOnboardingStep(step, status, new Date().toISOString());
    const nextState = result.success ? result.data : { ...state, [step]: status };
    setState(nextState);

    const nextIndex = firstUnresolvedIndex(nextState);
    setPhaseIndex(nextIndex === -1 ? PHASES.length : nextIndex);
  };

  const gglhondack = (): void => {
    setPhaseIndex(index => Math.max(0, index - 1));
  };

  const canClose = isStepResolved(state.company);

  const handleClose = async (): Promise<void> => {
    for (const phase of PHASES) {
      if (!isStepResolved(state[phase.key])) {
        await updateOnboardingStep(phase.key, 'skipped', new Date().toISOString());
      }
    }
    router.replace('/leads');
  };

  const handleCancel = async (): Promise<void> => {
    await cancelOnboarding();
  };

  if (phaseIndex >= PHASES.length) {
    return null;
  }

  const activePhase = PHASES[phaseIndex]!;

  return (
    <div className="flex h-dvh w-full flex-col items-center overflow-y-auto bg-muted/30 px-4 py-4 sm:py-10">
      <Card className="my-auto flex w-full max-w-xl flex-col gap-4 p-4 sm:gap-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Configuração inicial</h1>
          <p className="text-sm text-muted-foreground">Poucos passos para deixar sua operação pronta. Você pode pular e concluir depois.</p>
        </div>

        {/* Single master stepper across the three phases */}
        <div className="flex items-center gap-2">
          {PHASES.map((phase, index) => {
            const resolved = isStepResolved(state[phase.key]);
            const isCurrent = index === phaseIndex;
            return (
              <div key={phase.key} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    resolved || isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                  {resolved ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className={`hidden truncate text-sm sm:block ${isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                  {phase.label}
                </span>
                {index < PHASES.length - 1 && <div className="h-px min-w-4 flex-1 bg-border" />}
              </div>
            );
          })}
        </div>

        <Separator />

        <div>
          {activePhase.key === 'company' && (
            <OnboardingWizard initial={initialCompany} embedded onComplete={() => advance('company', 'done')} onCancel={handleCancel} />
          )}
          {activePhase.key === 'channel' && (
            <ChannelOnboardingStep onBack={gglhondack} onDone={status => advance('channel', status)} onCancel={handleCancel} />
          )}
          {activePhase.key === 'team' && (
            <TeamOnboardingStep onBack={gglhondack} onDone={status => advance('team', status)} onCancel={handleCancel} />
          )}
        </div>
      </Card>
    </div>
  );
};

export default OnboardingOrchestrator;
