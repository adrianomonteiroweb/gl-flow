export type IntegrationCategory = 'erp' | 'crm' | 'messaging' | 'billing';

export type CredentialFieldType = 'text' | 'password' | 'url';

export type CredentialField = {
  key: string;
  label: string;
  type: CredentialFieldType;
  required: boolean;
  helpText?: string;
  instructionText?: string;
  instructionUrl?: string;
  autoGenerate?: boolean;
  generate?: { type: 'hex'; bytes: number; helpText?: string };
};

export type IntegrationCapability = 'product_sync' | 'viability_check';

export type IntegrationDefinition = {
  /** Matches workspace_integrations.provider. */
  id: string;
  name: string;
  /** One-liner shown on the catalog card. */
  shortDescription: string;
  /** Longer copy shown in the detail "Visão geral" tab. */
  description: string;
  /** Path under /public, e.g. /integrations/voalle.svg */
  logo: string;
  category: IntegrationCategory;
  categoryLabel: string;
  capabilities: IntegrationCapability[];
  /** Whether the "Sincronização" tab is available. */
  canSync: boolean;
  /** Fields rendered (generically) by the onboarding wizard. */
  credentialFields: CredentialField[];
  docsUrl?: string;
};

const CAPABILITY_LABELS: Record<IntegrationCapability, string> = {
  product_sync: 'Sincronização de planos',
  viability_check: 'Consulta de viabilidade',
};

export const getCapabilityLabel = (capability: IntegrationCapability): string => CAPABILITY_LABELS[capability];

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: 'voalle',
    name: 'Voalle',
    shortDescription: 'ERP de provedores: catálogo de planos e checagem de viabilidade técnica.',
    description:
      'Conecte sua conta Voalle para sincronizar campanhas e planos automaticamente e consultar a viabilidade técnica por endereço durante o atendimento.',
    logo: '/integrations/voalle.svg',
    category: 'erp',
    categoryLabel: 'ERP',
    capabilities: ['product_sync', 'viability_check'],
    canSync: true,
    credentialFields: [
      {
        key: 'authUrl',
        label: 'URL de Autenticação',
        type: 'url',
        required: true,
        instructionText: 'URL fornecida pelo suporte Voalle para autenticação OAuth.',
      },
      {
        key: 'apiUrl',
        label: 'URL da API',
        type: 'url',
        required: true,
        instructionText: 'URL base da API REST do Voalle, fornecida pelo suporte.',
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'text',
        required: true,
        instructionText: 'Identificador do cliente OAuth fornecido pelo Voalle.',
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        instructionText: 'Chave secreta do cliente OAuth fornecida pelo Voalle.',
      },
      {
        key: 'syndata',
        label: 'Syndata',
        type: 'text',
        required: true,
        helpText: 'Identificador da base no Voalle.',
        instructionText: 'Identificador da base (syndata) fornecido pelo Voalle.',
      },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    shortDescription: 'Receba e responda atendimentos pelo seu bot do Telegram.',
    description:
      'Conecte um bot do Telegram para começar a receber leads em minutos. É o caminho mais rápido para colocar a operação no ar: crie um bot no @BotFather e cole o token aqui.',
    logo: '/integrations/telegram.svg',
    category: 'messaging',
    categoryLabel: 'Mensageria',
    capabilities: [],
    canSync: false,
    docsUrl: 'https://core.telegram.org/bots/tutorial',
    credentialFields: [
      {
        key: 'botToken',
        label: 'Token do Bot',
        type: 'password',
        required: true,
        helpText: 'Crie um bot com o @BotFather no Telegram e cole o token gerado.',
        instructionText:
          'Abra o Telegram, inicie uma conversa com @BotFather, envie /newbot e siga as instruções. Ao final, copie o token gerado.',
      },
      {
        key: 'webhookSecret',
        label: 'Webhook Secret',
        type: 'password',
        required: false,
        helpText: 'Token de segurança para validar webhooks recebidos do Telegram.',
        instructionText:
          'Gerado automaticamente ao configurar. Usado internamente para validar que as mensagens recebidas vêm do Telegram.',
        autoGenerate: true,
        generate: {
          type: 'hex',
          bytes: 32,
          helpText: 'Gera um token seguro automaticamente. Este valor é usado internamente para validar os webhooks recebidos.',
        },
      },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    shortDescription: 'Conecte um número do WhatsApp Business (Cloud API).',
    description:
      'Integre o WhatsApp Business via Cloud API da Meta para receber e responder atendimentos. Requer credenciais do app da Meta (Phone Number ID e token de acesso).',
    logo: '/integrations/whatsapp.svg',
    category: 'messaging',
    categoryLabel: 'Mensageria',
    capabilities: [],
    canSync: false,
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    credentialFields: [
      {
        key: 'phoneNumberId',
        label: 'Phone Number ID',
        type: 'text',
        required: true,
        helpText: 'Identificador do número no app da Meta.',
        instructionText:
          'Acesse developers.facebook.com, abra seu app e vá em WhatsApp > Configuração da API. O Phone Number ID aparece logo abaixo do número de telefone.',
      },
      {
        key: 'accessToken',
        label: 'Token de Acesso',
        type: 'password',
        required: true,
        instructionText:
          'No painel do app da Meta, vá em Configurações do Sistema > Tokens de Acesso. Gere um token permanente com as permissões whatsapp_business_messaging e whatsapp_business_management.',
      },
      {
        key: 'displayNumber',
        label: 'Número exibido',
        type: 'text',
        required: false,
        helpText: 'Número no formato internacional para identificação interna.',
        instructionText: 'O número de telefone no formato internacional que será exibido para identificação interna (ex: +55 85 99999-9999).',
      },
      {
        key: 'verifyToken',
        label: 'Verify Token',
        type: 'password',
        required: false,
        helpText: 'Usado na verificação do webhook.',
        instructionText:
          'Após salvar, copie este valor e cole no campo "Verify Token" ao configurar o webhook no painel da Meta (WhatsApp > Configuração > Webhook).',
        autoGenerate: true,
        generate: {
          type: 'hex',
          bytes: 32,
          helpText:
            'Gera um token seguro automaticamente. Após salvar, copie este valor e cole no campo "Verify Token" da configuração do webhook no painel da Meta.',
        },
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        type: 'password',
        required: false,
        instructionText:
          'No painel do app da Meta, vá em Configurações > Básico. O App Secret aparece na seção principal. Usado para validar a assinatura dos webhooks.',
      },
    ],
  },
];

export const getIntegration = (id: string): IntegrationDefinition | undefined => INTEGRATIONS.find(i => i.id === id);
