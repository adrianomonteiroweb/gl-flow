'use client';

import { CheckCircle2, AlertCircle, RefreshCw, CircleDashed } from 'lucide-react';
import { Badge } from '@workspace/ui/components/badge';
import { cn } from '@workspace/ui/lib/utils';
import type { IntegrationStatus } from '@/actions/integrations';

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; className: string; icon: typeof CheckCircle2; spin?: boolean }> = {
  connected: { label: 'Conectado', className: 'border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle2 },
  error: { label: 'Erro', className: 'border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: AlertCircle },
  syncing: { label: 'Sincronizando', className: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: RefreshCw, spin: true },
  disconnected: { label: 'Desconectado', className: 'border-transparent bg-muted text-muted-foreground', icon: CircleDashed },
};

export const IntegrationStatusBadge = ({ status, className }: { status: IntegrationStatus; className?: string }) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.disconnected;
  const Icon = config.icon;

  return (
    <Badge className={cn(config.className, className)}>
      <Icon className={cn('h-3 w-3', config.spin && 'animate-spin')} />
      {config.label}
    </Badge>
  );
};
