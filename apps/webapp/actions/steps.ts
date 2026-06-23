'use server';

import { StepRepository, StatusRepository, PipelineRepository } from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { getMe } from './users';

const WORKSPACE_REQUIRED_ERROR = 'Usuário não está vinculado a um workspace';

const resolvePipelineId = async (workspaceId: string, pipelineId?: string) => {
  if (pipelineId) return pipelineId;
  const pipeline = await PipelineRepository.findDefaultByWorkspace(workspaceId);
  return pipeline?.id ?? null;
};

export const getSteps = async (pipelineId?: string) => {
  const me = await getMe();
  if (!me) return { success: false, error: 'Usuário não autenticado' };

  try {
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false, error: WORKSPACE_REQUIRED_ERROR };

    const pid = await resolvePipelineId(workspaceId, pipelineId);
    if (!pid) return { success: true, data: [] };

    const steps = await StepRepository.findAllByPipeline(workspaceId, pid);
    return { success: true, data: steps };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao buscar steps' };
  }
};

export const getStepsWithStatuses = async (pipelineId?: string) => {
  const me = await getMe();
  if (!me) return { success: false, error: 'Usuário não autenticado' };

  try {
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false, error: WORKSPACE_REQUIRED_ERROR };

    const pid = await resolvePipelineId(workspaceId, pipelineId);
    if (!pid) return { success: true, data: [] };

    const steps = await StepRepository.findStagesByPipeline(workspaceId, pid);
    return { success: true, data: steps };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao buscar steps com status' };
  }
};

export const getStatusesByStep = async (stepId: string) => {
  const me = await getMe();
  if (!me) return { success: false, error: 'Usuário não autenticado' };

  try {
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false, error: WORKSPACE_REQUIRED_ERROR };

    const statuses = await StatusRepository.findStatusesForStep(workspaceId, stepId);
    return { success: true, data: statuses };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao buscar status' };
  }
};

export const getAllStatuses = async () => {
  const me = await getMe();
  if (!me) return { success: false, error: 'Usuário não autenticado' };

  try {
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false, error: WORKSPACE_REQUIRED_ERROR };

    const statuses = await StatusRepository.findAllByWorkspace(workspaceId);
    return { success: true, data: statuses };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao buscar todos os status' };
  }
};

export const validateStatusForStep = async (statusId: string, stepId: string) => {
  const me = await getMe();
  if (!me) return { success: false, error: 'Usuário não autenticado' };

  try {
    const isValid = await StatusRepository.validateStatusForStep(statusId, stepId);
    return { success: true, data: isValid };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao validar status' };
  }
};
