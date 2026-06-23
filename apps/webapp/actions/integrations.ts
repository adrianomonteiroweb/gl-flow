'use server';

import { nanoid } from 'nanoid';

import { WorkspaceIntegrationRepository, WaNumberRepository, encryptToken, decryptToken } from '@workspace/db';
import { resolveWorkspaceId } from '@/lib/workspaces/development-workspace';
import { canManageIntegrations } from '@/lib/auth/permissions';
import { INTEGRATIONS, getIntegration } from '@/lib/integrations/registry';
import { verifyVoalleConnection, type VoalleCredentials } from '@/lib/voalle';
import { syncVoalleProducts, type SyncResult } from '@/lib/products';
import { getTelegramBotInfo, setTelegramWebhook } from '@/utils/telegram';
import { buildAppSecretProof } from '@workspace/utils/whatsapp';

import { getMe } from './users';
import { updateOnboardingStep } from './onboarding';

export type CredentialValues = Record<string, string>;

const WORKSPACE_REQUIRED_ERROR = 'Usuário não está vinculado a um workspace';

export type IntegrationStatus = 'disconnected' | 'connected' | 'error' | 'syncing';

export type IntegrationViewModel = {
  id: string;
  connected: boolean;
  enabled: boolean;
  status: IntegrationStatus;
  lastSyncAt: string | null;
  lastSyncResult: SyncResult | null;
  lastError: string | null;
  /** Last 4 chars of a stable credential field, for "•••• 1234" hints. Never the full secret. */
  credentialHint: string | null;
};

type IntegrationRow = NonNullable<Awaited<ReturnType<typeof WorkspaceIntegrationRepository.findByProvider>>>;

const toViewModel = (providerId: string, row: IntegrationRow | null | undefined): IntegrationViewModel => ({
  id: providerId,
  connected: Boolean(row?.credentials),
  enabled: Boolean(row?.enabled),
  status: (row?.status as IntegrationStatus) ?? 'disconnected',
  lastSyncAt: row?.last_sync_at ?? null,
  lastSyncResult: (row?.last_sync_result as SyncResult | null) ?? null,
  lastError: row?.last_error ?? null,
  credentialHint: (row?.metadata as { credentialHint?: string } | null)?.credentialHint ?? null,
});

const requireContext = async () => {
  const me = await getMe();

  if (!me) {
    return { error: 'Usuário não autenticado' as const };
  }

  const workspaceId = await resolveWorkspaceId(me);

  if (!workspaceId) {
    return { error: WORKSPACE_REQUIRED_ERROR };
  }

  return { me, workspaceId };
};

export const listIntegrations = async () => {
  const ctx = await requireContext();

  if ('error' in ctx) {
    return { success: false as const, error: ctx.error };
  }

  const rows = await WorkspaceIntegrationRepository.findAllByWorkspace(ctx.workspaceId);
  const by_provider = new Map(rows.map(row => [row.provider, row]));

  const data = INTEGRATIONS.map(def => toViewModel(def.id, by_provider.get(def.id) ?? null));

  return { success: true as const, data };
};

export const getIntegrationState = async (id: string) => {
  const ctx = await requireContext();

  if ('error' in ctx) {
    return { success: false as const, error: ctx.error };
  }

  const definition = getIntegration(id);

  if (!definition) {
    return { success: false as const, error: 'Integração não encontrada' };
  }

  const row = await WorkspaceIntegrationRepository.findByProvider(ctx.workspaceId, id);

  return { success: true as const, data: toViewModel(id, row) };
};

export const getCredentialValues = async (id: string) => {
  try {
    const ctx = await requireContext();

    if ('error' in ctx) {
      return { success: false as const, error: ctx.error };
    }

    if (!canManageIntegrations(ctx.me.role)) {
      return { success: false as const, error: 'Você não tem permissão para gerenciar integrações.' };
    }

    const definition = getIntegration(id);

    if (!definition) {
      return { success: false as const, error: 'Integração não encontrada' };
    }

    const row = await WorkspaceIntegrationRepository.findByProvider(ctx.workspaceId, id);
    const empty: CredentialValues = Object.fromEntries(definition.credentialFields.map(f => [f.key, '']));

    if (!row?.credentials) {
      return { success: true as const, data: empty };
    }

    try {
      const decrypted: Record<string, string> = JSON.parse(decryptToken(row.credentials));
      const values: CredentialValues = Object.fromEntries(definition.credentialFields.map(f => [f.key, decrypted[f.key] ?? '']));

      return { success: true as const, data: values };
    } catch {
      return { success: true as const, data: empty };
    }
  } catch (error: unknown) {
    console.error('Error fetching credential values:', error);
    return { success: false as const, error: 'Erro ao buscar credenciais' };
  }
};

export const setIntegrationEnabled = async (id: string, enabled: boolean) => {
  try {
    const ctx = await requireContext();

    if ('error' in ctx) {
      return { success: false as const, error: ctx.error };
    }

    if (!canManageIntegrations(ctx.me.role)) {
      return { success: false as const, error: 'Você não tem permissão para gerenciar integrações.' };
    }

    const definition = getIntegration(id);

    if (!definition) {
      return { success: false as const, error: 'Integração não encontrada' };
    }

    const row = await WorkspaceIntegrationRepository.findByProvider(ctx.workspaceId, id);

    if (!row?.credentials) {
      return { success: false as const, error: 'Configure as credenciais antes de habilitar a integração.' };
    }

    const updated = await WorkspaceIntegrationRepository.update(row.id, {
      enabled,
      status: enabled ? 'connected' : 'disconnected',
    });

    return { success: true as const, data: toViewModel(id, updated) };
  } catch (error: any) {
    console.error('Error toggling integration:', error);
    return { success: false as const, error: error?.message || 'Erro ao atualizar integração' };
  }
};

const testConnection = async (id: string, values: Record<string, string>): Promise<string | null> => {
  if (id === 'voalle') {
    try {
      await verifyVoalleConnection(values as unknown as VoalleCredentials);
      return null;
    } catch (err) {
      return `Não foi possível conectar ao Voalle: ${String(err)}`;
    }
  }

  if (id === 'telegram') {
    const info = await getTelegramBotInfo(values.botToken ?? '');
    return info ? null : 'Token do bot inválido. Verifique o token gerado pelo @BotFather.';
  }

  if (id === 'whatsapp') {
    try {
      const params = new URLSearchParams({ access_token: values.accessToken ?? '' });

      if (values.appSecret?.trim()) {
        params.set('appsecret_proof', buildAppSecretProof(values.accessToken ?? '', values.appSecret));
      }

      const response = await fetch(`https://graph.facebook.com/v21.0/${values.phoneNumberId}?${params.toString()}`, { method: 'GET' });
      const body = (await response.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null;

      if (!response.ok || !body?.id) {
        const detail = body?.error?.message ?? `HTTP ${response.status}`;

        return `Não foi possível validar as credenciais do WhatsApp na Meta: ${detail}`;
      }

      return null;
    } catch (err) {
      return `Não foi possível validar o WhatsApp: ${String(err)}`;
    }
  }

  return null;
};

const buildCredentialHint = (id: string, values: Record<string, string>): string | null => {
  if (id === 'voalle' && values.clientId) {
    return values.clientId.slice(-4);
  }

  if (id === 'telegram' && values.botToken) {
    return values.botToken.slice(-4);
  }

  if (id === 'whatsapp' && values.phoneNumberId) {
    return values.phoneNumberId.slice(-4);
  }

  return null;
};

const applyChannelSideEffects = async (
  id: string,
  workspaceId: string,
  values: Record<string, string>
): Promise<{ values: Record<string, string> } | { error: string }> => {
  if (id === 'telegram') {
    const baseUrl = process.env.NEXTAUTH_URL;

    if (!baseUrl) {
      return { error: 'NEXTAUTH_URL não configurada — não foi possível registrar o webhook do Telegram.' };
    }

    if (!values.botToken) {
      return { error: 'Token do bot é obrigatório para conectar o Telegram.' };
    }

    const webhookSecret = values.webhookSecret || nanoid(32);
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhook/telegram/wk/${workspaceId}`;
    const result = await setTelegramWebhook(webhookUrl, webhookSecret, values.botToken);

    if (!result?.ok) {
      return { error: `Não foi possível registrar o webhook do Telegram: ${result?.description ?? 'erro desconhecido'}` };
    }

    return { values: { ...values, webhookSecret } };
  }

  if (id === 'whatsapp') {
    const existing = await WaNumberRepository.findByPhoneNumberId(values.phoneNumberId ?? '');

    if (existing && existing.workspace_id !== workspaceId) {
      return {
        error: 'Este número do WhatsApp já está conectado em outra conta. Cada número da Cloud API só pode ser usado em uma conta por vez.',
      };
    }

    const row = {
      workspace_id: workspaceId,
      phone_number_id: values.phoneNumberId,
      display_number: values.displayNumber || values.phoneNumberId,
      access_token: encryptToken(values.accessToken ?? ''),
      app_secret: values.appSecret || null,
      verify_token: values.verifyToken || null,
      is_active: true,
    };

    if (existing) {
      await WaNumberRepository.update((existing as { id: string }).id, row);
    } else {
      await WaNumberRepository.create(row);
    }

    return { values };
  }

  return { values };
};

export const saveIntegrationCredentials = async (id: string, values: Record<string, string>) => {
  try {
    const ctx = await requireContext();

    if ('error' in ctx) {
      return { success: false as const, error: ctx.error };
    }

    if (!canManageIntegrations(ctx.me.role)) {
      return { success: false as const, error: 'Você não tem permissão para gerenciar integrações.' };
    }

    const definition = getIntegration(id);

    if (!definition) {
      return { success: false as const, error: 'Integração não encontrada' };
    }

    const existing_row = await WorkspaceIntegrationRepository.findByProvider(ctx.workspaceId, id);
    const merged_values = { ...values };

    if (existing_row?.credentials) {
      try {
        const stored: Record<string, string> = JSON.parse(decryptToken(existing_row.credentials));

        for (const field of definition.credentialFields) {
          if (!merged_values[field.key]?.trim() && stored[field.key]?.trim()) {
            merged_values[field.key] = stored[field.key]!;
          }
        }
      } catch {
        // credenciais existentes ilegíveis (chave alterada ou formato antigo) — prosseguir com os valores enviados
      }
    }

    for (const field of definition.credentialFields) {
      if (field.required && !merged_values[field.key]?.trim()) {
        return { success: false as const, error: `O campo "${field.label}" é obrigatório.` };
      }
    }

    const test_error = await testConnection(id, merged_values);

    if (test_error) {
      return { success: false as const, error: test_error };
    }

    const side_effects = await applyChannelSideEffects(id, ctx.workspaceId, merged_values);

    if ('error' in side_effects) {
      return { success: false as const, error: side_effects.error };
    }

    const valuesToStore = side_effects.values;

    const credentials = encryptToken(JSON.stringify(valuesToStore));

    const updated = await WorkspaceIntegrationRepository.upsert(ctx.workspaceId, id, {
      credentials,
      enabled: true,
      status: 'connected',
      last_error: null,
      last_error_at: null,
      metadata: { credentialHint: buildCredentialHint(id, valuesToStore) },
    });

    const CHANNEL_INTEGRATIONS = ['telegram', 'whatsapp'];

    if (CHANNEL_INTEGRATIONS.includes(id)) {
      await updateOnboardingStep('channel', 'done').catch(() => {});
    }

    return { success: true as const, data: toViewModel(id, updated) };
  } catch (error: any) {
    console.error('Error saving integration credentials:', error);
    return { success: false as const, error: error?.message || 'Erro ao salvar credenciais' };
  }
};

export const disconnectIntegration = async (id: string) => {
  try {
    const ctx = await requireContext();

    if ('error' in ctx) {
      return { success: false as const, error: ctx.error };
    }

    if (!canManageIntegrations(ctx.me.role)) {
      return { success: false as const, error: 'Você não tem permissão para gerenciar integrações.' };
    }

    const row = await WorkspaceIntegrationRepository.findByProvider(ctx.workspaceId, id);

    if (!row) {
      return { success: true as const, data: toViewModel(id, null) };
    }

    const updated = await WorkspaceIntegrationRepository.update(row.id, {
      credentials: null,
      enabled: false,
      status: 'disconnected',
      last_error: null,
      last_error_at: null,
      metadata: null,
    });

    return { success: true as const, data: toViewModel(id, updated) };
  } catch (error: any) {
    console.error('Error disconnecting integration:', error);
    return { success: false as const, error: error?.message || 'Erro ao desconectar integração' };
  }
};

export const testIntegrationConnection = async (id: string) => {
  try {
    const ctx = await requireContext();

    if ('error' in ctx) {
      return { success: false as const, error: ctx.error };
    }

    if (!canManageIntegrations(ctx.me.role)) {
      return { success: false as const, error: 'Você não tem permissão para gerenciar integrações.' };
    }

    const definition = getIntegration(id);

    if (!definition) {
      return { success: false as const, error: 'Integração não encontrada' };
    }

    const row = await WorkspaceIntegrationRepository.findByProvider(ctx.workspaceId, id);

    if (!row?.credentials) {
      return { success: false as const, error: 'Configure as credenciais antes de testar a conexão.' };
    }

    const values: Record<string, string> = JSON.parse(decryptToken(row.credentials));
    const test_error = await testConnection(id, values);

    if (test_error) {
      const updated = await WorkspaceIntegrationRepository.update(row.id, {
        status: 'error',
        last_error: test_error,
        last_error_at: new Date().toISOString(),
      });

      return { success: false as const, error: test_error, data: toViewModel(id, updated) };
    }

    const updated = await WorkspaceIntegrationRepository.update(row.id, {
      status: row.enabled ? 'connected' : 'disconnected',
      last_error: null,
      last_error_at: null,
    });

    return { success: true as const, data: toViewModel(id, updated) };
  } catch (error: any) {
    console.error('Error testing integration connection:', error);
    return { success: false as const, error: error?.message || 'Erro ao testar conexão' };
  }
};

export const triggerIntegrationSync = async (id: string) => {
  try {
    const ctx = await requireContext();

    if ('error' in ctx) {
      return { success: false as const, error: ctx.error };
    }

    if (!canManageIntegrations(ctx.me.role)) {
      return { success: false as const, error: 'Você não tem permissão para gerenciar integrações.' };
    }

    if (id !== 'voalle') {
      return { success: false as const, error: 'Sincronização não suportada para esta integração' };
    }

    const row = await WorkspaceIntegrationRepository.findByProvider(ctx.workspaceId, id);

    if (row) {
      await WorkspaceIntegrationRepository.setStatus(row.id, 'syncing');
    }

    const result = await syncVoalleProducts(ctx.workspaceId);
    const hasErrors = result.errors.length > 0;

    await WorkspaceIntegrationRepository.upsert(ctx.workspaceId, id, {
      status: hasErrors ? 'error' : 'connected',
      last_sync_at: new Date().toISOString(),
      last_sync_result: result,
      last_error: hasErrors ? result.errors.join('; ') : null,
      last_error_at: hasErrors ? new Date().toISOString() : null,
    });

    return { success: true as const, data: result };
  } catch (error: any) {
    console.error('Error syncing integration:', error);
    return { success: false as const, error: error?.message || 'Erro ao sincronizar' };
  }
};
