export const WELCOME_MESSAGE =
  'Bem-vindo! Obrigado por nos escolher! Para seguir com seu atendimento como gostaria de ser chamado?';

// Kept as a function for forward compatibility (e.g., future per-workspace customization).
export const buildWelcomeMessage = (_profileName?: string | null): string => WELCOME_MESSAGE;
