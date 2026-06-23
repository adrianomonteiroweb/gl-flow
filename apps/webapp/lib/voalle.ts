import { WorkspaceIntegrationRepository, decryptToken } from '@workspace/db';

export type VoalleCredentials = {
  authUrl: string;
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  syndata: string;
};

type VoalleAuthResponse = {
  access_token: string;
  expires_in: number;
};

type VoalleViabilityResponse = {
  success: boolean;
  response?: {
    viability: boolean;
    ctos: number;
    ports: number;
    verifyViabilityId: number;
  };
};

export type VoalleViabilityResult =
  | { success: true; viable: boolean; ctos: number; ports: number; verifyViabilityId: number }
  | { success: false; error: string };

export const resolveVoalleCredentials = async (workspaceId?: string): Promise<VoalleCredentials | null> => {
  if (!workspaceId) {
    return null;
  }

  const row = await WorkspaceIntegrationRepository.findByProvider(workspaceId, 'voalle');

  if (!row?.enabled || !row.credentials) {
    return null;
  }

  try {
    return JSON.parse(decryptToken(row.credentials)) as VoalleCredentials;
  } catch (err) {
    console.error('[Voalle] Falha ao decifrar credenciais do workspace:', String(err));
    return null;
  }
};

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

const cacheKey = (creds: VoalleCredentials): string => `${creds.authUrl}|${creds.clientId}|${creds.clientSecret}|${creds.syndata}`;

export const getAccessToken = async (creds: VoalleCredentials, options?: { forceRefresh?: boolean }): Promise<string> => {
  const key = cacheKey(creds);

  if (!options?.forceRefresh) {
    const hit = tokenCache.get(key);

    if (hit && Date.now() < hit.expiresAt) {
      return hit.token;
    }
  }

  const body = `grant_type=client_credentials&scope=syngw&client_id=${creds.clientId}&client_secret=${creds.clientSecret}&syndata=${creds.syndata}`;

  const res = await fetch(creds.authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Voalle auth failed: ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as VoalleAuthResponse;

  if (!data.access_token) {
    throw new Error('Voalle auth retornou resposta sem access_token.');
  }

  tokenCache.set(key, { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 });
  return data.access_token;
};

export const verifyVoalleConnection = async (creds: VoalleCredentials): Promise<void> => {
  const token = await getAccessToken(creds, { forceRefresh: true });

  const res = await fetch(`${creds.apiUrl}/external/integrations/thirdparty/crm/campaignsandpricelistservices`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Voalle API failed: ${res.status}: ${errBody}`);
  }
};

export const checkViability = async (
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  },
  workspaceId?: string
): Promise<VoalleViabilityResult> => {
  try {
    const creds = await resolveVoalleCredentials(workspaceId);

    if (!creds) {
      return { success: false, error: 'Integração Voalle não configurada' };
    }

    const token = await getAccessToken(creds);

    const res = await fetch(`${creds.apiUrl}/external/integrations/thirdparty/verifyviability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullAddress: {
          address: address.street,
          number: address.number,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          postalCode: address.zipCode.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
        },
        distance: 300,
      }),
    });

    const rawBody = await res.text();

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${rawBody}` };
    }

    const data = JSON.parse(rawBody) as VoalleViabilityResponse;

    if (!data.success || !data.response) {
      return { success: false, error: 'API returned success: false' };
    }

    return {
      success: true,
      viable: data.response.viability,
      ctos: data.response.ctos,
      ports: data.response.ports,
      verifyViabilityId: data.response.verifyViabilityId,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
};
