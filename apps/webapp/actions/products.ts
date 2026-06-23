'use server';

import { z } from 'zod';
import { ProductRepository, ProductExternalRefRepository, WorkspaceIntegrationRepository } from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { triggerIntegrationSync } from './integrations';
import { getMe } from './users';

const CoverageCity = z.object({
  city: z.string().min(1),
  state: z.string().length(2),
});

const CreateProductSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['internet_plan', 'combo', 'addon_service', 'benefit']),
  category: z.string().optional(),
  base_price: z.string().optional(),
  is_loyalty: z.boolean().optional(),
  loyalty_months: z.number().int().positive().optional(),
  loyalty_price: z.string().optional(),
  specs: z.record(z.any()).optional(),
  benefits: z.array(z.string()).optional(),
  coverage_cities: z.array(CoverageCity).optional(),
  payment_method: z.string().optional(),
  is_visible: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

type CreateProductParams = z.infer<typeof CreateProductSchema>;

const UpdateProductSchema = CreateProductSchema.partial();

type UpdateProductParams = z.infer<typeof UpdateProductSchema>;

const WORKSPACE_REQUIRED_ERROR = 'Usuário não está vinculado a um workspace';

export const getProducts = async () => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };
  const workspaceId = await resolveWorkspaceId(me);
  if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

  const data = await ProductRepository.findAllByWorkspace(workspaceId);
  return { success: true as const, data };
};

export const getActiveProducts = async () => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };
  const workspaceId = await resolveWorkspaceId(me);
  if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

  const data = await ProductRepository.findActiveByWorkspace(workspaceId);
  return { success: true as const, data };
};

export const getProductsByCity = async (city: string) => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };
  const workspaceId = await resolveWorkspaceId(me);
  if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

  const data = await ProductRepository.findAvailableByCity(workspaceId, city);
  return { success: true as const, data };
};

export const getProduct = async (id: string) => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };
  const workspaceId = await resolveWorkspaceId(me);
  if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

  const data = await ProductRepository.findById(id);
  if (!data || data.workspace_id !== workspaceId) {
    return { success: false as const, error: 'Produto não encontrado' };
  }

  return { success: true as const, data };
};

export const createProduct = async (params: CreateProductParams) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const parsed = CreateProductSchema.safeParse(params);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    const existing = await ProductRepository.findByWorkspaceAndCode(workspaceId, parsed.data.code);
    if (existing) {
      return { success: false as const, error: 'Já existe um produto com este código' };
    }

    const data = await ProductRepository.create({
      ...parsed.data,
      workspace_id: workspaceId,
      source: 'manual',
    });

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating product:', error);
    return { success: false as const, error: error?.message || 'Erro ao criar produto' };
  }
};

export const updateProduct = async (id: string, params: UpdateProductParams) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const product = await ProductRepository.findById(id);
    if (!product || product.workspace_id !== workspaceId) {
      return { success: false as const, error: 'Produto não encontrado' };
    }

    const parsed = UpdateProductSchema.safeParse(params);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    const updateData: Record<string, any> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updateData[key] = value;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true as const, data: null };
    }

    const data = await ProductRepository.update(id, updateData);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating product:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar produto' };
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };
    const workspaceId = await resolveWorkspaceId(me);
    if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

    const product = await ProductRepository.findById(id);
    if (!product || product.workspace_id !== workspaceId) {
      return { success: false as const, error: 'Produto não encontrado' };
    }

    const data = await ProductRepository.softDelete(id);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return { success: false as const, error: error?.message || 'Erro ao remover produto' };
  }
};

export const getProductExternalRefs = async (productId: string) => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };
  const workspaceId = await resolveWorkspaceId(me);
  if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

  const product = await ProductRepository.findById(productId);
  if (!product || product.workspace_id !== workspaceId) {
    return { success: false as const, error: 'Produto não encontrado' };
  }

  const data = await ProductExternalRefRepository.findByProductId(productId);
  return { success: true as const, data };
};

// Auto-sync invoked on the /products page load. Only runs when the Voalle
// integration is both active (enabled) and configured (has credentials),
// otherwise it skips silently without touching the integration status.
// When it does run, it delegates to the shared Voalle sync path so the
// "Apps e Integrações" Sincronização tab and this auto-sync update last_sync_*.
export const autoSyncProducts = async () => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };
  const workspaceId = await resolveWorkspaceId(me);
  if (!workspaceId) return { success: false as const, error: WORKSPACE_REQUIRED_ERROR };

  const integration = await WorkspaceIntegrationRepository.findByProvider(workspaceId, 'voalle');
  if (!integration?.enabled || !integration?.credentials) {
    return { success: true as const, skipped: true as const };
  }

  return triggerIntegrationSync('voalle');
};
