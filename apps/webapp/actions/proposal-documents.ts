'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, workspaces_table, ProductRepository, ProposalDocumentRepository } from '@workspace/db';
import { ChatRepository } from '@/repositories/ChatRepository';
import { buildVariableValues } from '@/lib/proposals/variables';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { LeadActivityLogger } from '@/lib/activities/lead-activity-logger';
import { getMe } from './users';

const getProductId = (product: any): string | null => {
  if (!product?.id || typeof product.id !== 'string') {
    return null;
  }

  return product.id;
};

/**
 * Builds the variable context for a chat/lead: resolves every template variable
 * to real data and returns the list of products that can be used as the plan.
 */
export const buildProposalContext = async (chatId: string, productId?: string) => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };

  const relation = await ChatRepository.getChatWithLeadById(chatId);
  if (!relation || !relation.lead) {
    return { success: false as const, error: 'Conversa não encontrada' };
  }

  const { chat, lead } = relation;
  const relationWorkspaceId = chat?.workspace_id ?? lead?.workspace_id ?? null;
  const userWorkspaceId = await resolveWorkspaceId(me);
  const workspaceId = relationWorkspaceId ?? userWorkspaceId;

  if (me.workspace_id && relationWorkspaceId && relationWorkspaceId !== me.workspace_id) {
    return { success: false as const, error: 'Conversa não encontrada' };
  }

  if (!me.workspace_id && relationWorkspaceId && process.env.NODE_ENV === 'production') {
    return { success: false as const, error: 'Conversa não encontrada' };
  }

  // Resolve the product: explicit override > chat selection > lead selection.
  let product: any = chat?.payload?.selected_plan ?? lead?.payload?.selected_plan ?? null;
  const selectedProductId = productId ?? getProductId(product);
  if (selectedProductId && workspaceId) {
    const override = await ProductRepository.findById(selectedProductId);
    if (override && override.workspace_id === workspaceId && !override.deleted_at) {
      product = override;
    } else if (productId) {
      product = null;
    }
  }

  const workspace = workspaceId
    ? (await db.select().from(workspaces_table).where(eq(workspaces_table.id, workspaceId)).limit(1))[0] ?? null
    : null;

  const values = buildVariableValues({ lead, chat, product, workspace });
  const productOptions = workspaceId ? await ProductRepository.findActiveByWorkspace(workspaceId) : [];

  return {
    success: true as const,
    data: {
      values,
      productOptions,
      leadId: lead.id,
      selectedProductId: product?.id ?? null,
    },
  };
};

export const getLeadProposalDocuments = async (leadId: string) => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };

  const docs = await ProposalDocumentRepository.findAllByLead(leadId);
  const data = docs.filter((d: any) => d.workspace_id === me.workspace_id);
  return { success: true as const, data };
};

export const getProposalDocument = async (id: string) => {
  const me = await getMe();
  if (!me) return { success: false as const, error: 'Usuário não autenticado' };

  const data = await ProposalDocumentRepository.findById(id);
  if (!data || data.workspace_id !== me.workspace_id || data.deleted_at) {
    return { success: false as const, error: 'Documento não encontrado' };
  }

  return { success: true as const, data };
};

const CreateDocumentSchema = z.object({
  leadId: z.string().min(1),
  chatId: z.string().optional(),
  templateId: z.string().optional(),
  title: z.string().min(1, 'Título é obrigatório'),
  /** Final resolved HTML snapshot (used for the print/PDF view). */
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  status: z.enum(['draft', 'generated']).optional(),
  values: z.record(z.string()).optional(),
  productId: z.string().optional(),
  /** Editor HTML with {{TOKEN}} variables, kept so the document can be re-edited. */
  editorContent: z.string().optional(),
});

type CreateDocumentParams = z.infer<typeof CreateDocumentSchema>;

const UpdateDocumentSchema = CreateDocumentSchema.partial().omit({ leadId: true });

type UpdateDocumentParams = z.infer<typeof UpdateDocumentSchema>;

export const createProposalDocument = async (params: CreateDocumentParams) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };

    const parsed = CreateDocumentSchema.safeParse(params);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    const { leadId, chatId, templateId, title, content, status, values, productId, editorContent } = parsed.data;

    const data = await ProposalDocumentRepository.create({
      workspace_id: me.workspace_id ?? null,
      lead_id: leadId,
      chat_id: chatId ?? null,
      template_id: templateId ?? null,
      created_by: me.id,
      title,
      content,
      status: status ?? 'generated',
      payload: { values: values ?? {}, productId: productId ?? null, editorContent: editorContent ?? null },
    });

    LeadActivityLogger.log({
      workspace_id: me.workspace_id ?? null,
      lead_id: leadId,
      chat_id: chatId ?? null,
      type: 'proposal_created',
      actor_type: 'user',
      actor_id: me.id,
      actor_name: me.name,
      metadata: { proposalId: data?.id, title },
    });

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error creating proposal document:', error);
    return { success: false as const, error: error?.message || 'Erro ao salvar documento' };
  }
};

export const updateProposalDocument = async (id: string, params: UpdateDocumentParams) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };

    const doc = await ProposalDocumentRepository.findById(id);
    if (!doc || doc.workspace_id !== me.workspace_id || doc.deleted_at) {
      return { success: false as const, error: 'Documento não encontrado' };
    }

    const parsed = UpdateDocumentSchema.safeParse(params);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return { success: false as const, error: message };
    }

    const updateData: Record<string, any> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.templateId !== undefined) updateData.template_id = parsed.data.templateId;
    if (
      parsed.data.values !== undefined ||
      parsed.data.productId !== undefined ||
      parsed.data.editorContent !== undefined
    ) {
      updateData.payload = {
        ...(doc.payload ?? {}),
        ...(parsed.data.values !== undefined ? { values: parsed.data.values } : {}),
        ...(parsed.data.productId !== undefined ? { productId: parsed.data.productId } : {}),
        ...(parsed.data.editorContent !== undefined ? { editorContent: parsed.data.editorContent } : {}),
      };
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true as const, data: doc };
    }

    const data = await ProposalDocumentRepository.update(id, updateData);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error updating proposal document:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar documento' };
  }
};

export const deleteProposalDocument = async (id: string) => {
  try {
    const me = await getMe();
    if (!me) return { success: false as const, error: 'Usuário não autenticado' };

    const doc = await ProposalDocumentRepository.findById(id);
    if (!doc || doc.workspace_id !== me.workspace_id || doc.deleted_at) {
      return { success: false as const, error: 'Documento não encontrado' };
    }

    const data = await ProposalDocumentRepository.softDelete(id);
    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error deleting proposal document:', error);
    return { success: false as const, error: error?.message || 'Erro ao remover documento' };
  }
};
