import type { AvailableProduct } from '@/lib/products';

const EMOJI_NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const buildPlanBlock = (product: AvailableProduct): string => {
  const emoji = EMOJI_NUMBERS[product.index - 1] ?? `${product.index}.`;
  const price = Number(product.base_price ?? 0);
  const benefits = (product.benefits ?? []) as string[];
  const specs = (product.specs ?? {}) as Record<string, unknown>;
  const speed = specs.download as string | undefined;

  const lines = [
    `*${emoji} ${product.name}*`,
  ];

  if (speed) {
    lines.push(`🚀 Velocidade: ${speed}`);
  }

  lines.push(`💰 *${formatCurrency(price)}*/mês`);

  if (product.is_loyalty && product.loyalty_months) {
    lines.push(`📋 Fidelidade: ${product.loyalty_months} meses`);
  }

  if (product.payment_method) {
    lines.push(`💳 Pagamento: ${product.payment_method}`);
  }

  if (benefits.length > 0) {
    lines.push(`✅ ${benefits.join(', ')}`);
  }

  return lines.join('\n');
};

const MAX_MESSAGE_LENGTH = 4000;

export const buildPlansListMessage = (products: AvailableProduct[]): string[] => {
  const header = 'Ótima notícia! 🎉 Seu endereço tem viabilidade técnica!\n\n📡 *Planos disponíveis para sua região:*';
  const footer = '\nPara escolher, digite o *número* do plano desejado.';
  const separator = '\n\n━━━━━━━━━━━━━━━━━\n';

  const planBlocks = products.map(buildPlanBlock);

  const fullMessage = header + separator + planBlocks.join(separator) + '\n' + footer;

  if (fullMessage.length <= MAX_MESSAGE_LENGTH) {
    return [fullMessage];
  }

  const messages: string[] = [];
  let current = header;

  for (let i = 0; i < planBlocks.length; i++) {
    const block = separator + planBlocks[i]!;
    const isLast = i === planBlocks.length - 1;
    const suffix = isLast ? '\n' + footer : '';

    if (current.length + block.length + suffix.length > MAX_MESSAGE_LENGTH && current !== header) {
      messages.push(current);
      current = planBlocks[i]!;
    } else {
      current += block;
    }

    if (isLast) {
      messages.push(current + '\n' + footer);
    }
  }

  return messages;
};

export const buildPlanConfirmationMessage = (product: AvailableProduct): string => {
  const price = Number(product.base_price ?? 0);
  const benefits = (product.benefits ?? []) as string[];
  const specs = (product.specs ?? {}) as Record<string, unknown>;
  const speed = specs.download as string | undefined;

  const lines = [
    'Você escolheu o plano:',
    '',
    `*${product.name}*`,
  ];

  if (speed) {
    lines.push(`🚀 Velocidade: ${speed}`);
  }

  lines.push(`💰 *${formatCurrency(price)}*/mês`);

  if (product.is_loyalty && product.loyalty_months) {
    lines.push(`📋 Fidelidade: ${product.loyalty_months} meses`);
  }

  if (product.payment_method) {
    lines.push(`💳 Pagamento: ${product.payment_method}`);
  }

  if (benefits.length > 0) {
    lines.push(`✅ ${benefits.join(', ')}`);
  }

  lines.push('', 'Em breve nossa equipe entrará em contato para concluir seu atendimento. 😊');

  return lines.join('\n');
};
