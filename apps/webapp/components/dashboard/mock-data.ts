import { TrendingUp, Wallet, Handshake, ClipboardCheck, type LucideIcon } from 'lucide-react';

export type StatTrend = {
  direction: 'up' | 'down';
  label: string;
};

export type DashboardStat = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  trend?: StatTrend;
  icon: LucideIcon;
  accent: string;
};

export const DASHBOARD_STATS: DashboardStat[] = [
  {
    key: 'sales',
    label: 'Vendas do mês',
    value: '8',
    trend: { direction: 'up', label: '23% vs. mês anterior' },
    icon: TrendingUp,
    accent: 'text-primary',
  },
  {
    key: 'revenue',
    label: 'Faturamento',
    value: 'R$ 312 mil',
    trend: { direction: 'up', label: '15% vs. mês anterior' },
    icon: Wallet,
    accent: 'text-emerald-600',
  },
  {
    key: 'negotiating',
    label: 'Em negociação',
    value: '12',
    hint: 'R$ 480 mil em pipeline',
    icon: Handshake,
    accent: 'text-sky-600',
  },
  {
    key: 'approval',
    label: 'Aguardando aprovação',
    value: '3',
    hint: '2 Holmes · 1 Fandi',
    icon: ClipboardCheck,
    accent: 'text-amber-600',
  },
];

export type PipelineBadgeTone = 'sky' | 'amber' | 'violet' | 'emerald' | 'slate';

export type PipelineCardItem = {
  id: string;
  name: string;
  model: string;
  value?: string;
  badge: string;
  badgeTone: PipelineBadgeTone;
};

export type PipelineColumnData = {
  key: string;
  title: string;
  items: PipelineCardItem[];
};

export const PIPELINE_PREVIEW: PipelineColumnData[] = [
  {
    key: 'prospect',
    title: 'Prospecção',
    items: [
      { id: 'p1', name: 'Maria Silva', model: 'CG 160 Titan', badge: 'Financiamento', badgeTone: 'sky' },
      { id: 'p2', name: 'José Santos', model: 'Biz 125', badge: 'À vista', badgeTone: 'emerald' },
    ],
  },
  {
    key: 'proposal',
    title: 'Proposta',
    items: [
      { id: 'pr1', name: 'Pedro Alves', model: 'CB 300F Twister', value: 'R$ 22.990', badge: 'Financ.', badgeTone: 'sky' },
      { id: 'pr2', name: 'Carlos Mendes', model: 'CG 160 Start', value: 'R$ 14.490', badge: '+ Troca', badgeTone: 'amber' },
    ],
  },
  {
    key: 'approval',
    title: 'Aprovação',
    items: [{ id: 'a1', name: 'Ricardo Souza', model: 'NXR 160 Bros', value: 'R$ 19.990', badge: 'Holmes', badgeTone: 'violet' }],
  },
  {
    key: 'invoice',
    title: 'Faturar',
    items: [{ id: 'f1', name: 'Lucas Ferreira', model: 'CG 160 Fan', value: 'R$ 13.990', badge: 'Pronto', badgeTone: 'emerald' }],
  },
];

export type ActivityTone = 'emerald' | 'sky' | 'amber' | 'red' | 'violet';

export type ActivityItem = {
  id: string;
  name: string;
  text: string;
  time: string;
  tone: ActivityTone;
};

export const RECENT_ACTIVITY: ActivityItem[] = [
  { id: 'a1', name: 'Lucas Ferreira', text: 'Proposta aprovada no Holmes', time: 'há 12 min', tone: 'emerald' },
  { id: 'a2', name: 'Fernanda Costa', text: 'Financiamento aprovado (BV)', time: 'há 45 min', tone: 'sky' },
  { id: 'a3', name: 'Ricardo Souza', text: 'Aguardando aprovação do gerente', time: 'há 1 h', tone: 'amber' },
  { id: 'a4', name: 'Linx', text: 'NF emitida #4521 (CG 160 Fan)', time: 'há 2 h', tone: 'red' },
  { id: 'a5', name: 'IHS', text: 'Contemplação consórcio Ana Lima', time: 'há 3 h', tone: 'violet' },
];
