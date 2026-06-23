'use server';

import { and, eq, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { db, WorkspaceRepository, WorkspaceIntegrationRepository, users_table, workspaces_table, flow_configs_table } from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { isCompanyConfigured, type CompanyProfile } from '@/lib/company/profile';
import { UserRepository } from '@/repositories/UserRepository';
import {
  INITIAL_ONBOARDING_STATE,
  isOnboardingComplete,
  normalizeOnboardingState,
  type OnboardingState,
  type OnboardingStepKey,
  type OnboardingStepStatus,
} from '@/lib/onboarding/state';
import { destroySession } from './auth';

import { getMe } from './users';

const VALID_STEPS: OnboardingStepKey[] = ['company', 'channel', 'team'];
const VALID_STATUSES: OnboardingStepStatus[] = ['pending', 'done', 'skipped'];

type OnboardingResult = { success: true; data: OnboardingState } | { success: false; error: string };

const CHANNEL_PROVIDERS = ['telegram', 'whatsapp'];

const hasConnectedChannel = async (workspaceId: string): Promise<boolean> => {
  try {
    const rows = await WorkspaceIntegrationRepository.findAllByWorkspace(workspaceId);
    return rows.some(row => CHANNEL_PROVIDERS.includes(row.provider) && Boolean(row.credentials));
  } catch {
    return false;
  }
};

const hasTeamMembers = async (workspaceId: string): Promise<boolean> => {
  try {
    const count = await UserRepository.count(
      and(eq(users_table.workspace_id, workspaceId), or(eq(users_table.role, 'admin'), eq(users_table.role, 'member')))
    );

    return count > 0;
  } catch {
    return false;
  }
};

export const getOnboardingState = async (): Promise<OnboardingResult> => {
  const me = await getMe();

  if (!me) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  const workspaceId = await resolveWorkspaceId(me);

  if (!workspaceId) {
    return { success: false, error: 'Workspace não encontrado' };
  }

  const workspace = await WorkspaceRepository.findById(workspaceId);
  const payload = (workspace?.payload ?? null) as Record<string, any> | null;

  const state = normalizeOnboardingState(payload?.onboarding ?? INITIAL_ONBOARDING_STATE);
  const company = (payload?.company ?? null) as CompanyProfile | null;

  if (isCompanyConfigured(company) && state.company === 'pending') {
    state.company = 'done';
  }

  if (state.channel !== 'done' && (await hasConnectedChannel(workspaceId))) {
    state.channel = 'done';
  }

  if (state.team !== 'done' && (await hasTeamMembers(workspaceId))) {
    state.team = 'done';
  }

  return { success: true, data: state };
};

export const updateOnboardingStep = async (
  step: OnboardingStepKey,
  status: OnboardingStepStatus,
  completedAt?: string
): Promise<OnboardingResult> => {
  try {
    if (!VALID_STEPS.includes(step)) {
      return { success: false, error: 'Etapa inválida' };
    }

    if (!VALID_STATUSES.includes(status)) {
      return { success: false, error: 'Status inválido' };
    }

    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const workspaceId = await resolveWorkspaceId(me);

    if (!workspaceId) {
      return { success: false, error: 'Workspace não encontrado' };
    }

    await WorkspaceRepository.updateOnboarding(workspaceId, { [step]: status });

    const refreshed = await getOnboardingState();

    if (!refreshed.success) {
      return refreshed;
    }

    if (isOnboardingComplete(refreshed.data) && !refreshed.data.completedAt && completedAt) {
      await WorkspaceRepository.updateOnboarding(workspaceId, { completedAt });
      refreshed.data.completedAt = completedAt;
    }

    return refreshed;
  } catch (error: any) {
    console.error('Error updating onboarding step:', error);
    return { success: false, error: error?.message || 'Erro ao atualizar onboarding' };
  }
};

export const cancelOnboarding = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    const workspaceId = await resolveWorkspaceId(me);

    if (!workspaceId) {
      return { success: false, error: 'Workspace não encontrado' };
    }

    await db.transaction(async (tx) => {
      await tx.delete(flow_configs_table).where(eq(flow_configs_table.workspace_id, workspaceId));
      await tx.delete(users_table).where(eq(users_table.id, me.id));
      await tx.delete(workspaces_table).where(eq(workspaces_table.id, workspaceId));
    });

    await destroySession();
    redirect('/login');
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }

    console.error('Error cancelling onboarding:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao cancelar onboarding' };
  }
};
