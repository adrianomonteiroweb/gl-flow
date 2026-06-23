export type OnboardingStepStatus = 'pending' | 'done' | 'skipped';

export type OnboardingStepKey = 'company' | 'channel' | 'team';

export type OnboardingState = {
  company: OnboardingStepStatus;
  channel: OnboardingStepStatus;
  team: OnboardingStepStatus;
  completedAt?: string;
};

export const CRITICAL_ONBOARDING_STEPS: OnboardingStepKey[] = ['company', 'channel', 'team'];

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  company: 'pending',
  channel: 'pending',
  team: 'pending',
};

export const isStepResolved = (status?: OnboardingStepStatus): boolean => status === 'done' || status === 'skipped';

export const normalizeOnboardingState = (value?: Partial<OnboardingState> | null): OnboardingState => ({
  company: value?.company ?? 'pending',
  channel: value?.channel ?? 'pending',
  team: value?.team ?? 'pending',
  completedAt: value?.completedAt,
});

export const isOnboardingComplete = (state: OnboardingState): boolean => CRITICAL_ONBOARDING_STEPS.every(step => isStepResolved(state[step]));

export const countResolvedSteps = (state: OnboardingState): number => CRITICAL_ONBOARDING_STEPS.filter(step => isStepResolved(state[step])).length;

export const isOnboardingAllDone = (state: OnboardingState): boolean => CRITICAL_ONBOARDING_STEPS.every(step => state[step] === 'done');

export const countDoneSteps = (state: OnboardingState): number => CRITICAL_ONBOARDING_STEPS.filter(step => state[step] === 'done').length;
