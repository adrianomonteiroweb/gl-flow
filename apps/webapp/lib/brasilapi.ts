import { capitalize, formatCep, formatCnpj, formatPhoneBR, onlyNumbers } from '@workspace/utils/text';

export type BrasilApiAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

const BRASIL_API_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'linharesflow/1.0',
};

const fetchFromBrasilApi = async (cleanZip: string, version: 'v1' | 'v2'): Promise<BrasilApiAddress | null> => {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/${version}/${cleanZip}`, {
      headers: BRASIL_API_HEADERS,
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as Record<string, string>;

    if (!data.city && !data.street && !data.neighborhood) {
      return null;
    }

    return {
      cep: cleanZip,
      street: data.street ?? '',
      neighborhood: data.neighborhood ?? '',
      city: data.city ?? '',
      state: data.state ?? '',
    };
  } catch {
    return null;
  }
};

const fetchFromViaCep = async (cleanZip: string): Promise<BrasilApiAddress | null> => {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      cep?: string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      erro?: boolean;
    };

    if (data.erro) {
      return null;
    }

    return {
      cep: cleanZip,
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    return null;
  }
};

export const fetchAddressByZip = async (zip: string): Promise<BrasilApiAddress | null> => {
  const cleanZip = zip.replace(/\D/g, '');

  if (cleanZip.length !== 8) {
    return null;
  }

  const v2 = await fetchFromBrasilApi(cleanZip, 'v2');

  if (v2) {
    return v2;
  }

  const v1 = await fetchFromBrasilApi(cleanZip, 'v1');
  if (v1) {
    return v1;
  }

  return await fetchFromViaCep(cleanZip);
};

/**
 * Provider ("prestadora") company data resolved from a CNPJ. Company names are
 * kept as returned (usually uppercase) to match legal documents, while address
 * parts are title-cased for readability.
 */
export type BrasilApiCompany = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidadeUf: string;
  cep: string;
  email: string;
};

/** Composes "Avenida Manoel Cacule, 379C" from the address parts of the CNPJ response. */
const composeAddress = (data: Record<string, any>): string => {
  const tipo = capitalize(String(data.descricao_tipo_de_logradouro ?? '').trim());
  const logradouro = capitalize(String(data.logradouro ?? '').trim());
  const numero = String(data.numero ?? '').trim();
  const complemento = String(data.complemento ?? '').trim();

  const street = [tipo, logradouro].filter(Boolean).join(' ');
  return [street, numero, complemento].filter(Boolean).join(', ');
};

export const fetchCompanyByCnpj = async (cnpj: string): Promise<BrasilApiCompany | null> => {
  const cleanCnpj = onlyNumbers(cnpj);

  if (cleanCnpj.length !== 14) {
    return null;
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      headers: BRASIL_API_HEADERS,
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as Record<string, any>;

    if (!data.razao_social) {
      return null;
    }

    const municipio = capitalize(String(data.municipio ?? '').trim());
    const uf = String(data.uf ?? '')
      .trim()
      .toUpperCase();

    return {
      razaoSocial: String(data.razao_social ?? '').trim(),
      nomeFantasia: String(data.nome_fantasia ?? '').trim(),
      cnpj: formatCnpj(cleanCnpj),
      telefone: data.ddd_telefone_1 ? formatPhoneBR(String(data.ddd_telefone_1)) : '',
      endereco: composeAddress(data),
      bairro: capitalize(String(data.bairro ?? '').trim()),
      cidadeUf: municipio && uf ? `${municipio}/${uf}` : municipio || uf,
      cep: data.cep ? formatCep(String(data.cep)) : '',
      email: data.email ? String(data.email).trim() : '',
    };
  } catch {
    return null;
  }
};
