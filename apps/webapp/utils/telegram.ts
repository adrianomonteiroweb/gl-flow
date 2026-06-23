const HTTP_TIMEOUT_MS = 10_000;

const apiBase = (botToken: string): string => `https://api.telegram.org/bot${botToken}`;

const fetchWithTimeout = (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
};

export const sendTelegramMessage = async (chatId: number | string, text: string, botToken?: string | null): Promise<void> => {
  if (!botToken) {
    throw new Error('Integração Telegram não configurada');
  }

  const response = await fetchWithTimeout(`${apiBase(botToken)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }
};

export const setTelegramWebhook = async (webhookUrl: string, secretToken: string, botToken: string): Promise<any> => {
  const response = await fetchWithTimeout(`${apiBase(botToken)}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      ...(secretToken && { secret_token: secretToken }),
    }),
  });

  return response.json();
};

export const getTelegramBotInfo = async (botToken: string): Promise<{ username: string } | null> => {
  try {
    const response = await fetchWithTimeout(`${apiBase(botToken)}/getMe`, { method: 'GET' });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { ok?: boolean; result?: { username?: string } };

    if (!body.ok || !body.result?.username) {
      return null;
    }

    return { username: body.result.username };
  } catch {
    return null;
  }
};
