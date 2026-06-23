/**
 * Shared (client + server safe) types and helpers for the provider company
 * profile. Intentionally free of server-only imports so both the onboarding
 * wizard, the settings form and the server actions can use them.
 */

export type CompanyBrandColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export type CompanyProfile = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  atoAutorizacaoAnatel: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidadeUf: string;
  cep: string;
  site: string;
  email: string;
  logoUrl: string;
  logoKey: string;
  logoFileName: string;
  logoMimeType: string;
  useLogoColors: boolean;
  brandColors: CompanyBrandColors;
};

export const DEFAULT_COMPANY_BRAND_COLORS: CompanyBrandColors = {
  primary: '#1260A8',
  secondary: '#A8C8E4',
  accent: '#E0ECF5',
};

export const EMPTY_COMPANY: CompanyProfile = {
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  inscricaoEstadual: '',
  atoAutorizacaoAnatel: '',
  telefone: '',
  endereco: '',
  bairro: '',
  cidadeUf: '',
  cep: '',
  site: '',
  email: '',
  logoUrl: '',
  logoKey: '',
  logoFileName: '',
  logoMimeType: '',
  useLogoColors: false,
  brandColors: DEFAULT_COMPANY_BRAND_COLORS,
};

/** Merges a partial profile (e.g. loaded from storage) onto the empty template. */
export const toCompanyProfile = (data?: Partial<CompanyProfile> | null): CompanyProfile => {
  const profile = data ?? {};

  return {
    ...EMPTY_COMPANY,
    ...profile,
    brandColors: {
      ...DEFAULT_COMPANY_BRAND_COLORS,
      ...(profile.brandColors ?? {}),
    },
  };
};

/** Onboarding is considered done once the identifying fields (CNPJ + razão social) are filled. */
export const isCompanyConfigured = (company?: Partial<CompanyProfile> | null): boolean => {
  if (!company) {
    return false;
  }

  return Boolean(company.cnpj?.trim() && company.razaoSocial?.trim());
};
