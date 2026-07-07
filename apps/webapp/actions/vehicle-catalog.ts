'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { VehicleModelRepository, VEHICLE_SEGMENTS, VEHICLE_CONDITIONS } from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { canAccessSettings } from '@/lib/auth/permissions';

import { getMe } from './users';

const WORKSPACE_REQUIRED_ERROR = 'Usuário não está vinculado a um workspace';

const VehicleModelSchema = z.object({
  make: z.string().max(100).optional(),
  model: z.string().min(1, 'Modelo é obrigatório').max(150, 'Modelo muito longo'),
  version: z.string().max(150).optional().nullable(),
  segment: z.enum(VEHICLE_SEGMENTS, { errorMap: () => ({ message: 'Segmento inválido' }) }),
  condition: z.enum(VEHICLE_CONDITIONS, { errorMap: () => ({ message: 'Condição inválida' }) }).default('new'),
  model_year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  manufacture_year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  price: z.coerce.number().positive('Informe um preço válido'),
  image_url: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
});

const UpdateVehicleModelSchema = VehicleModelSchema.partial();

type ReadOk = { workspaceId: string };
type WriteOk = { workspaceId: string };
type GuardErr = { error: string };

const readGuard = async (): Promise<ReadOk | GuardErr> => {
  const me = await getMe();

  if (!me) {
    return { error: 'Usuário não autenticado' };
  }

  const workspaceId = await resolveWorkspaceId(me);

  if (!workspaceId) {
    return { error: WORKSPACE_REQUIRED_ERROR };
  }

  return { workspaceId };
};

const writeGuard = async (): Promise<WriteOk | GuardErr> => {
  const me = await getMe();

  if (!me) {
    return { error: 'Usuário não autenticado' };
  }

  if (!canAccessSettings(me.role)) {
    return { error: 'Sem permissão para gerenciar o catálogo' };
  }

  const workspaceId = await resolveWorkspaceId(me);

  if (!workspaceId) {
    return { error: WORKSPACE_REQUIRED_ERROR };
  }

  return { workspaceId };
};

export const getVehicleModels = async () => {
  try {
    const auth = await readGuard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const data = await VehicleModelRepository.findAllByWorkspace(auth.workspaceId);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching vehicle models:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar o catálogo' };
  }
};

export const getActiveVehicleModels = async () => {
  try {
    const auth = await readGuard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const data = await VehicleModelRepository.findActiveByWorkspace(auth.workspaceId);

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error fetching active vehicle models:', error);
    return { success: false as const, error: error?.message || 'Erro ao carregar o catálogo' };
  }
};

export const createVehicleModel = async (input: unknown) => {
  try {
    const auth = await writeGuard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const parsed = VehicleModelSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const existing = await VehicleModelRepository.findAllByWorkspace(auth.workspaceId);
    const nextOrder = existing.reduce((max: number, m: any) => Math.max(max, Number(m.sort_order) || 0), 0) + 1;

    const data = await VehicleModelRepository.create({
      workspace_id: auth.workspaceId,
      make: parsed.data.make?.trim() || 'Honda',
      model: parsed.data.model.trim(),
      version: parsed.data.version?.trim() || null,
      segment: parsed.data.segment,
      condition: parsed.data.condition,
      model_year: parsed.data.model_year ?? null,
      manufacture_year: parsed.data.manufacture_year ?? null,
      price: String(parsed.data.price),
      image_url: parsed.data.image_url?.trim() || null,
      is_active: parsed.data.is_active ?? true,
      sort_order: nextOrder,
    });

    revalidatePath('/catalog');

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating vehicle model:', error);
    return { success: false as const, error: error?.message || 'Erro ao criar veículo' };
  }
};

export const updateVehicleModel = async (id: string, input: unknown) => {
  try {
    const auth = await writeGuard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const model = await VehicleModelRepository.findInWorkspace(id, auth.workspaceId);

    if (!model) {
      return { success: false as const, error: 'Veículo não encontrado' };
    }

    const parsed = UpdateVehicleModelSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.make !== undefined) {
      updateData.make = parsed.data.make?.trim() || 'Honda';
    }

    if (parsed.data.model !== undefined) {
      updateData.model = parsed.data.model.trim();
    }

    if (parsed.data.version !== undefined) {
      updateData.version = parsed.data.version?.trim() || null;
    }

    if (parsed.data.segment !== undefined) {
      updateData.segment = parsed.data.segment;
    }

    if (parsed.data.condition !== undefined) {
      updateData.condition = parsed.data.condition;
    }

    if (parsed.data.model_year !== undefined) {
      updateData.model_year = parsed.data.model_year ?? null;
    }

    if (parsed.data.manufacture_year !== undefined) {
      updateData.manufacture_year = parsed.data.manufacture_year ?? null;
    }

    if (parsed.data.price !== undefined) {
      updateData.price = String(parsed.data.price);
    }

    if (parsed.data.image_url !== undefined) {
      updateData.image_url = parsed.data.image_url?.trim() || null;
    }

    if (parsed.data.is_active !== undefined) {
      updateData.is_active = parsed.data.is_active;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true as const, data: model };
    }

    const data = await VehicleModelRepository.update(id, updateData);

    revalidatePath('/catalog');

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating vehicle model:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar veículo' };
  }
};

export const toggleVehicleModelActive = async (id: string, isActive: boolean) => {
  try {
    const auth = await writeGuard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const model = await VehicleModelRepository.findInWorkspace(id, auth.workspaceId);

    if (!model) {
      return { success: false as const, error: 'Veículo não encontrado' };
    }

    const data = await VehicleModelRepository.update(id, { is_active: isActive });

    revalidatePath('/catalog');

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error toggling vehicle model:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar veículo' };
  }
};

export const deleteVehicleModel = async (id: string) => {
  try {
    const auth = await writeGuard();

    if ('error' in auth) {
      return { success: false as const, error: auth.error };
    }

    const model = await VehicleModelRepository.findInWorkspace(id, auth.workspaceId);

    if (!model) {
      return { success: false as const, error: 'Veículo não encontrado' };
    }

    await VehicleModelRepository.softDelete(id);

    revalidatePath('/catalog');

    return { success: true as const, data: null };
  } catch (error: any) {
    console.error('Error deleting vehicle model:', error);
    return { success: false as const, error: error?.message || 'Erro ao excluir veículo' };
  }
};
