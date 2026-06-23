export const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    novo: 'Novo',
    pending: 'Pendente',
    em_atendimento: 'Em Atendimento',
    aguardando_cliente: 'Aguardando Cliente',
    em_analise: 'Em Análise',
    concluido: 'Concluído',
    encerrado: 'Encerrado',
    aguardando_resposta: 'Aguardando Resposta',
    analise_viabilidade: 'Análise Viabilidade',
    sem_viabilidade: 'Sem Viabilidade',
    viavel_tecnicamente: 'Viável Tecnicamente',
    qualificado: 'Qualificado',
    nao_qualificado: 'Não Qualificado',
    proposta_enviada: 'Proposta Enviada',
    em_analise_cliente: 'Em Análise (Cliente)',
    proposta_aceita: 'Proposta Aceita',
    proposta_recusada: 'Proposta Recusada',
    negociacao_iniciada: 'Negociação Iniciada',
    aguardando_decisao: 'Aguardando Decisão',
    aguardando_assinatura: 'Aguardando Assinatura',
    negociacao_perdida: 'Negociação Perdida',
    negociacao_ganha: 'Negociação Ganha',
  };

  return statusLabels[status?.toLowerCase()] || status || '—';
};

export const getStepBadgeColor = (step: string): string => {
  switch (step?.toLowerCase()) {
    case 'new':
      return 'bg-blue-100 text-blue-800';
    case 'qualified':
      return 'bg-purple-100 text-purple-800';
    case 'negotiation':
      return 'bg-orange-100 text-orange-800';
    case 'closed':
    case 'closed_won':
      return 'bg-green-100 text-green-800';
    case 'closed_lost':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStepLabel = (step: string): string => {
  const stepLabels: Record<string, string> = {
    new: 'Novo',
    qualified: 'Qualificação',
    negotiation: 'Negociação',
    closed: 'Fechado',
    closed_won: 'Fechado – Ganho',
    closed_lost: 'Fechado – Perdido',
  };

  return stepLabels[step?.toLowerCase()] || step || '—';
};
