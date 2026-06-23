'use server';

import { z } from 'zod';
import { ProposalTemplateRepository } from '@workspace/db';
import { ChatRepository } from '@/repositories/ChatRepository';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { getMe } from './users';
import { DEFAULT_PROPOSAL_TEMPLATES } from '@/lib/proposals/default-templates';

const CategoryEnum = z.enum(['proposta', 'contrato', 'termo']);

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category: CategoryEnum.default('proposta'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  is_active: z.boolean().optional(),
});

type CreateTemplateParams = z.infer<typeof CreateTemplateSchema>;

const UpdateTemplateSchema = CreateTemplateSchema.partial();

type UpdateTemplateParams = z.infer<typeof UpdateTemplateSchema>;

const resolveTemplateWorkspaceId = async (me: any, chatId?: string): Promise<string | null> => {
  if (chatId) {
    const relation = await ChatRepository.getChatWithLeadById(chatId);
    const chatWorkspaceId = relation?.chat?.workspace_id ?? relation?.lead?.workspace_id ?? null;

    if (chatWorkspaceId) {
      return chatWorkspaceId;
    }
  }

  return resolveWorkspaceId(me);
};

export const getProposalTemplates = async () => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };

  const data = await ProposalTemplateRepository.findAllByWorkspace(me.workspace_id);
  return { success: true as const, data };
};

export const getActiveProposalTemplates = async (chatId?: string) => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };

  const workspaceId = await resolveTemplateWorkspaceId(me, chatId);
  const data = await ProposalTemplateRepository.findActiveAvailableForWorkspace(workspaceId);
  return { success: true as const, data };
};

export const getProposalTemplate = async (id: string) => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };

  const data = await ProposalTemplateRepository.findById(id);
  if (!data || data.workspace_id !== me.workspace_id || data.deleted_at) {
    return { success: false as const, error: 'Modelo não encontrado' };
  }

  return { success: true as const, data };
};

export const createProposalTemplate = async (params: CreateTemplateParams) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };

    const parsed = CreateTemplateSchema.safeParse(params);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    const data = await ProposalTemplateRepository.create({
      ...parsed.data,
      workspace_id: me.workspace_id ?? null,
    });

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating proposal template:', error);
    return { success: false as const, error: error?.message || 'Erro ao criar modelo' };
  }
};

export const updateProposalTemplate = async (id: string, params: UpdateTemplateParams) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };

    const template = await ProposalTemplateRepository.findById(id);
    if (!template || template.workspace_id !== me.workspace_id || template.deleted_at) {
      return { success: false as const, error: 'Modelo não encontrado' };
    }

    const parsed = UpdateTemplateSchema.safeParse(params);
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

    const data = await ProposalTemplateRepository.update(id, updateData);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating proposal template:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar modelo' };
  }
};

export const deleteProposalTemplate = async (id: string) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };

    const template = await ProposalTemplateRepository.findById(id);
    if (!template || template.workspace_id !== me.workspace_id || template.deleted_at) {
      return { success: false as const, error: 'Modelo não encontrado' };
    }

    const data = await ProposalTemplateRepository.softDelete(id);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error deleting proposal template:', error);
    return { success: false as const, error: error?.message || 'Erro ao remover modelo' };
  }
};

/**
 * Creates a fresh copy of each built-in default template so the user can
 * rename/edit it into a new model. Can be called multiple times.
 */
export const seedDefaultProposalTemplates = async () => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };

    const created = [];
    for (const template of DEFAULT_PROPOSAL_TEMPLATES) {
      const row = await ProposalTemplateRepository.create({
        workspace_id: me.workspace_id ?? null,
        name: template.name,
        description: template.description,
        category: template.category,
        content: template.content,
      });
      created.push(row);
    }

    return { success: true as const, data: created };
  } catch (error: any) {
    console.error('Error seeding default proposal templates:', error);
    return { success: false as const, error: error?.message || 'Erro ao adicionar modelo padrão' };
  }
};
