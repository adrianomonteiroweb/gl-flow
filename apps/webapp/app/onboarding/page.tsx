import { getCompanyProfile } from '@/actions/company';
import { getOnboardingState } from '@/actions/onboarding';
import { OnboardingOrchestrator } from '@/components/onboarding/orchestrator';
import { INITIAL_ONBOARDING_STATE } from '@/lib/onboarding/state';

export default async function OnboardingPage() {
  const [companyResult, stateResult] = await Promise.all([getCompanyProfile(), getOnboardingState()]);

  const initialCompany = companyResult.success ? companyResult.data : null;
  const initialState = stateResult.success ? stateResult.data : INITIAL_ONBOARDING_STATE;

  return <OnboardingOrchestrator initialCompany={initialCompany} initialState={initialState} />;
}
