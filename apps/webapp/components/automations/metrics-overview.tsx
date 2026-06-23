'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Users, Target, Clock, TrendingUp } from 'lucide-react';
import { Progress } from '@workspace/ui/components/progress';

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  AWAITING_NAME: { label: 'Aguardando nome', color: 'bg-blue-100 text-blue-700' },
  AWAITING_ADDRESS_ZIP: { label: 'Aguardando CEP', color: 'bg-indigo-100 text-indigo-700' },
  AWAITING_ADDRESS_STREET: { label: 'Aguardando rua', color: 'bg-violet-100 text-violet-700' },
  AWAITING_ADDRESS_NUMBER: { label: 'Aguardando número', color: 'bg-purple-100 text-purple-700' },
  QUALIFIED: { label: 'Qualificado', color: 'bg-green-100 text-green-700' },
  BOT_PAUSED: { label: 'Bot pausado', color: 'bg-yellow-100 text-yellow-700' },
  INACTIVE: { label: 'Inativo', color: 'bg-gray-100 text-gray-600' },
  CLOSED: { label: 'Encerrado', color: 'bg-slate-100 text-slate-600' },
};

type ConvStateCount = {
  conv_state: string | null;
  count: number;
};

type AvgTimeEntry = {
  state: string;
  avgMinutes: number;
};

type Props = {
  convStateCounts: ConvStateCount[];
  qualificationRate: number;
  avgTimePerState: AvgTimeEntry[];
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

export function MetricsOverview({ convStateCounts, qualificationRate, avgTimePerState }: Props) {
  const total = convStateCounts.reduce((s, r) => s + r.count, 0);
  const qualifiedCount = convStateCounts.find(r => r.conv_state === 'QUALIFIED')?.count ?? 0;
  const activeCount = convStateCounts
    .filter(r => r.conv_state && !['INACTIVE', 'CLOSED'].includes(r.conv_state))
    .reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="size-4" />
              Total de leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="size-4" />
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="size-4" />
              Qualificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{qualifiedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="size-4" />
              Taxa de qualificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{qualificationRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads per state */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {convStateCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
            ) : (
              convStateCounts.map(row => {
                const stateKey = row.conv_state ?? 'unknown';
                const config = STATE_LABELS[stateKey];
                const pct = total > 0 ? (row.count / total) * 100 : 0;
                return (
                  <div key={stateKey} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config?.color ?? 'bg-muted text-muted-foreground'}`}>
                        {config?.label ?? stateKey}
                      </span>
                      <span className="font-medium tabular-nums">{row.count}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Avg time per state */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4" />
              Tempo médio por estado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {avgTimePerState.length === 0 ? (
              <p className="text-sm text-muted-foreground">Dados insuficientes para calcular.</p>
            ) : (
              avgTimePerState.map(entry => {
                const config = STATE_LABELS[entry.state];
                return (
                  <div key={entry.state} className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-xs ${config?.color ?? ''}`}>
                      {config?.label ?? entry.state}
                    </Badge>
                    <span className="text-sm font-mono font-medium">{formatDuration(entry.avgMinutes)}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
