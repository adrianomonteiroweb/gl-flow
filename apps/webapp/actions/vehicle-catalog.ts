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
  segment: z.enum(VEHICLE_SEGMENTS, { errorMap: () => ({ message: 'Segmento inválido' }) }).default('street'),
  condition: z.enum(VEHICLE_CONDITIONS, { errorMap: () => ({ message: 'Condição inválida' }) }).default('new'),
  model_year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  manufacture_year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  price: z.coerce.number().positive('Informe um preço válido'),
  image_url: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
  mileage: z.coerce.number().int().min(0).optional().nullable(),
  chassi: z.string().max(17).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  stock_entry_date: z.string().optional().nullable(),
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

    const { mileage, chassi, color, stock_entry_date, ...columns } = parsed.data;

    const vehiclePayload: Record<string, unknown> = {};

    if (mileage !== undefined && mileage !== null) {
      vehiclePayload.mileage = mileage;
    }

    if (chassi) {
      vehiclePayload.chassi = chassi.trim().toUpperCase();
    }

    if (color) {
      vehiclePayload.color = color.trim();
    }

    if (stock_entry_date) {
      vehiclePayload.stock_entry_date = stock_entry_date;
    }

    const data = await VehicleModelRepository.create({
      workspace_id: auth.workspaceId,
      make: columns.make?.trim() || 'Honda',
      model: columns.model.trim(),
      version: columns.version?.trim() || null,
      segment: columns.segment,
      condition: columns.condition,
      model_year: columns.model_year ?? null,
      manufacture_year: columns.manufacture_year ?? null,
      price: String(columns.price),
      image_url: columns.image_url?.trim() || null,
      is_active: columns.is_active ?? true,
      sort_order: nextOrder,
      payload: Object.keys(vehiclePayload).length > 0 ? vehiclePayload : null,
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

    const { mileage, chassi, color, stock_entry_date, ...columnFields } = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (columnFields.make !== undefined) {
      updateData.make = columnFields.make?.trim() || 'Honda';
    }

    if (columnFields.model !== undefined) {
      updateData.model = columnFields.model.trim();
    }

    if (columnFields.version !== undefined) {
      updateData.version = columnFields.version?.trim() || null;
    }

    if (columnFields.segment !== undefined) {
      updateData.segment = columnFields.segment;
    }

    if (columnFields.condition !== undefined) {
      updateData.condition = columnFields.condition;
    }

    if (columnFields.model_year !== undefined) {
      updateData.model_year = columnFields.model_year ?? null;
    }

    if (columnFields.manufacture_year !== undefined) {
      updateData.manufacture_year = columnFields.manufacture_year ?? null;
    }

    if (columnFields.price !== undefined) {
      updateData.price = String(columnFields.price);
    }

    if (columnFields.image_url !== undefined) {
      updateData.image_url = columnFields.image_url?.trim() || null;
    }

    if (columnFields.is_active !== undefined) {
      updateData.is_active = columnFields.is_active;
    }

    const payloadFields: Record<string, unknown> = {};

    if (mileage !== undefined) {
      payloadFields.mileage = mileage;
    }

    if (chassi !== undefined) {
      payloadFields.chassi = chassi ? chassi.trim().toUpperCase() : null;
    }

    if (color !== undefined) {
      payloadFields.color = color ? color.trim() : null;
    }

    if (stock_entry_date !== undefined) {
      payloadFields.stock_entry_date = stock_entry_date || null;
    }

    if (Object.keys(payloadFields).length > 0) {
      const existingPayload = (model.payload as Record<string, unknown>) ?? {};
      updateData.payload = { ...existingPayload, ...payloadFields };
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
