'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Circle, X } from 'lucide-react';

import { Card } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Progress } from '@workspace/ui/components/progress';

import { getOnboardingState } from '@/actions/onboarding';
import { listIntegrations } from '@/actions/integrations';
import { canManageIntegrations } from '@/lib/auth/permissions';
import { isStepResolved, type OnboardingState } from '@/lib/onboarding/state';
import { useSessionContext } from '@/contexts/session';

const DISMISS_KEY = 'glhonda:getting-started:dismissed';

type ItemStatus = 'done' | 'skipped' | 'pending';

type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  status: ItemStatus;
  href: string;
  cta: string;
  critical: boolean;
};

const StatusIcon = ({ status }: { status: ItemStatus }) => {
  if (status === 'done') {
    return <Check className="h-4 w-4 text-primary" />;
  }

  return <Circle className={`h-4 w-4 ${status === 'skipped' ? 'text-muted-foreground' : 'text-muted-foreground/60'}`} />;
};

export const GettingStartedChecklist = () => {
  const { user } = useSessionContext();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [channelConnected, setChannelConnected] = useState(false);
  const [voalleConnected, setVoalleConnected] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const canManage = canManageIntegrations(user?.role);

  useEffect(() => {
    setDismissed(typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  const fetchState = useCallback(() => {
    if (!canManage) {
      return;
    }

    let active = true;

    Promise.all([getOnboardingState(), listIntegrations()])
      .then(([onboarding, integrations]) => {
        if (!active) {
          return;
        }

        if (onboarding.success) {
          setState(onboarding.data);
        }

        if (integrations.success) {
          const items = integrations.data;
          setChannelConnected(items.some(item => (item.id === 'telegram' || item.id === 'whatsapp') && item.connected));
          setVoalleConnected(items.some(item => item.id === 'voalle' && item.connected));
        }
      })
      .finally(() => active && setLoaded(true));

    return () => {
      active = false;
    };
  }, [canManage]);

  useEffect(() => {
    return fetchState();
  }, [fetchState]);

  useEffect(() => {
    const handler = () => fetchState();
    document.addEventListener('onboarding:updated', handler);
    document.addEventListener('users:updated', handler);

    return () => {
      document.removeEventListener('onboarding:updated', handler);
      document.removeEventListener('users:updated', handler);
    };
  }, [fetchState]);

  const items: ChecklistItem[] = useMemo(() => {
    if (!state) {
      return [];
    }

    const channelStatus: ItemStatus = channelConnected ? 'done' : isStepResolved(state.channel) ? 'skipped' : 'pending';
    const teamStatus: ItemStatus = state.team === 'done' ? 'done' : state.team === 'skipped' ? 'skipped' : 'pending';
    const companyStatus: ItemStatus = state.company === 'done' ? 'done' : state.company === 'skipped' ? 'skipped' : 'pending';

    return [
      {
        key: 'company',
        label: 'Configurar empresa',
        description: 'Dados da prestadora (CNPJ, endereço).',
        status: companyStatus,
        href: '/company',
        cta: 'Configurar',
        critical: true,
      },
      {
        key: 'channel',
        label: 'Conectar um canal',
        description: 'Telegram ou WhatsApp para receber leads.',
        status: channelStatus,
        href: '/settings/integrations',
        cta: 'Conectar',
        critical: true,
      },
      {
        key: 'team',
        label: 'Convidar o time',
        description: 'Atendentes para distribuir os atendimentos.',
        status: teamStatus,
        href: '/users',
        cta: 'Convidar',
        critical: true,
      },
      {
        key: 'products',
        label: 'Cadastrar produtos',
        description: 'Cadastre manualmente ou conecte o Voalle.',
        status: voalleConnected ? 'done' : 'pending',
        href: '/settings/integrations',
        cta: 'Configurar',
        critical: false,
      },
    ];
  }, [state, channelConnected, voalleConnected]);

  const criticalItems = items.filter(item => item.critical);
  const doneCount = criticalItems.filter(item => item.status === 'done').length;
  const allCriticalDone = criticalItems.length > 0 && doneCount === criticalItems.length;

  const dismiss = (): void => {
    setDismissed(true);
    window.localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!canManage || !loaded || dismissed || allCriticalDone || items.length === 0) {
    return null;
  }

  const progress = Math.round((doneCount / criticalItems.length) * 100);

  return (
    <Card className="mb-4 flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Primeiros passos</h3>
          <p className="text-xs text-muted-foreground">
            {doneCount} de {criticalItems.length} concluídos — finalize para deixar a operação pronta.
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={dismiss} aria-label="Dispensar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Progress value={progress} className="h-1.5" />

      <ul className="flex flex-col divide-y divide-border">
        {items.map(item => (
          <li key={item.key} className="flex items-center gap-3 py-2.5">
            <StatusIcon status={item.status} />
            <div className="flex flex-1 flex-col">
              <span className={`text-sm ${item.status === 'done' ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                {item.label}
                {!item.critical && <span className="ml-2 text-xs font-normal text-muted-foreground">(opcional)</span>}
              </span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
            {item.status !== 'done' && (
              <Button asChild variant="outline" size="sm">
                <Link href={item.href}>
                  {item.cta}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default GettingStartedChecklist;
