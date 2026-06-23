'use server';

import { z } from 'zod';

import { WorkspaceRepository } from '@workspace/db';
import { fetchCompanyByCnpj, type BrasilApiCompany } from '@/lib/brasilapi';
import { DEFAULT_COMPANY_BRAND_COLORS, isCompanyConfigured, toCompanyProfile, type CompanyProfile } from '@/lib/company/profile';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';

import { getMe } from './users';

type CnpjLookupResult =
  | { available: false; company: null }
  | { available: true; company: BrasilApiCompany | null };

export const lookupCompanyByCnpj = async (cnpj: string): Promise<CnpjLookupResult> => {
  const digits = cnpj.replace(/\D/g, '');

  if (digits.length === 14) {
    const me = await getMe();
    const workspaceId = me ? await resolveWorkspaceId(me) : null;
    const existing = await WorkspaceRepository.findByCnpj(digits, workspaceId ?? undefined);

    if (existing) {
      return { available: false, company: null };
    }
  }

  const company = await fetchCompanyByCnpj(cnpj);
  return { available: true, company };
};

const CompanySchema = z.object({
  razaoSocial: z.string().optional().default(''),
  nomeFantasia: z.string().optional().default(''),
  cnpj: z.string().optional().default(''),
  inscricaoEstadual: z.string().optional().default(''),
  atoAutorizacaoAnatel: z.string().optional().default(''),
  telefone: z.string().optional().default(''),
  endereco: z.string().optional().default(''),
  bairro: z.string().optional().default(''),
  cidadeUf: z.string().optional().default(''),
  cep: z.string().optional().default(''),
  site: z.string().optional().default(''),
  email: z.string().email('E-mail invalido').optional().or(z.literal('')).default(''),
  logoUrl: z.string().optional().default(''),
  logoKey: z.string().optional().default(''),
  logoFileName: z.string().optional().default(''),
  logoMimeType: z.string().optional().default(''),
  useLogoColors: z.boolean().optional().default(false),
  brandColors: z
    .object({
      primary: z.string().optional().default(DEFAULT_COMPANY_BRAND_COLORS.primary),
      secondary: z.string().optional().default(DEFAULT_COMPANY_BRAND_COLORS.secondary),
      accent: z.string().optional().default(DEFAULT_COMPANY_BRAND_COLORS.accent),
    })
    .optional()
    .default(DEFAULT_COMPANY_BRAND_COLORS),
});

export const getCompanyProfile = async () => {
  const me = await getMe();

  if (!me) {
    return { success: false as const, error: 'Usuario nao autenticado' };
  }

  const workspace_id = await resolveWorkspaceId(me);

  if (!workspace_id) {
    return { success: false as const, error: 'Workspace nao encontrado' };
  }

  const workspace = await WorkspaceRepository.findById(workspace_id);

  const payload = (workspace?.payload ?? null) as Record<string, any> | null;
  const company = (payload?.company ?? null) as CompanyProfile | null;

  return { success: true as const, data: company ? toCompanyProfile(company) : null };
};

export const saveCompanyProfile = async (input: unknown) => {
  try {
    const me = await getMe();

    if (!me) {
      return { success: false as const, error: 'Usuario nao autenticado' };
    }

    const workspace_id = await resolveWorkspaceId(me);

    if (!workspace_id) {
      return { success: false as const, error: 'Workspace nao encontrado' };
    }

    const parsed = CompanySchema.safeParse(input);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Dados invalidos';

      return { success: false as const, error: message };
    }

    const cnpjDigits = (parsed.data.cnpj ?? '').replace(/\D/g, '');

    if (cnpjDigits.length === 14) {
      const existing = await WorkspaceRepository.findByCnpj(cnpjDigits, workspace_id);

      if (existing) {
        return { success: false as const, error: 'Este CNPJ já está cadastrado em outra conta.' };
      }
    }

    const data = await WorkspaceRepository.updateCompany(workspace_id, parsed.data);

    if (isCompanyConfigured(parsed.data)) {
      await WorkspaceRepository.updateOnboarding(workspace_id, { company: 'done' });
    }

    return { success: true as const, data };
  } catch (error: any) {
    console.error('Error saving company profile:', error);
    return { success: false as const, error: error?.message || 'Erro ao salvar dados da empresa' };
  }
};
