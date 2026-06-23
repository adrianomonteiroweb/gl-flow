import { WorkspaceIntegrationRepository, decryptToken } from '@workspace/db';

type TelegramCredentials = { botToken?: string; webhookSecret?: string };

export const resolveTelegramBotToken = async (workspaceId?: string | null): Promise<string | null> => {
  if (!workspaceId) {
    return null;
  }

  const row = await WorkspaceIntegrationRepository.findByProvider(workspaceId, 'telegram');

  if (!row?.enabled || !row.credentials) {
    return null;
  }

  try {
    const creds = JSON.parse(decryptToken(row.credentials)) as TelegramCredentials;
    return creds.botToken ?? null;
  } catch (err) {
    console.error('[Telegram] Falha ao decifrar credenciais do workspace:', String(err));
    return null;
  }
};
