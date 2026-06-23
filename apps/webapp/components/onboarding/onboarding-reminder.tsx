'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Circle, Settings } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { Progress } from '@workspace/ui/components/progress';

import { getOnboardingState } from '@/actions/onboarding';
import { useSessionContext } from '@/contexts/session';
import { canManageIntegrations } from '@/lib/auth/permissions';
import { CRITICAL_ONBOARDING_STEPS, countDoneSteps, isOnboardingAllDone, type OnboardingState } from '@/lib/onboarding/state';

const STEP_META: Record<string, { label: string; href: string; cta: string }> = {
  company: { label: 'Configurar empresa', href: '/company', cta: 'Configurar' },
  channel: { label: 'Conectar um canal', href: '/settings/integrations', cta: 'Conectar' },
  team: { label: 'Convidar o time', href: '/users', cta: 'Convidar' },
};

export const OnboardingReminder = () => {
  const { user } = useSessionContext();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const canManage = canManageIntegrations(user?.role);

  const fetchState = useCallback(() => {
    if (!canManage) {
      return;
    }

    let active = true;

    getOnboardingState().then(result => {
      if (!active) {
        return;
      }

      if (result.success) {
        setState(result.data);
      }
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [canManage]);

  useEffect(() => {
    const cleanup = fetchState();
    return cleanup;
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

  if (!canManage || !loaded || !state || isOnboardingAllDone(state)) {
    return null;
  }

  const doneCount = countDoneSteps(state);
  const totalSteps = CRITICAL_ONBOARDING_STEPS.length;
  const progress = Math.round((doneCount / totalSteps) * 100);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:scale-105"
        aria-label="Abrir checklist de configuração">
        <Settings className="h-4 w-4" />
        <span className="text-sm font-medium">
          {doneCount}/{totalSteps} configurados
        </span>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <Card className="flex flex-col gap-3 p-4 shadow-xl border">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Configuração pendente</h4>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setExpanded(false)} aria-label="Minimizar">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground">
          {doneCount} de {totalSteps} concluídos
        </p>

        <ul className="flex flex-col gap-1">
          {CRITICAL_ONBOARDING_STEPS.map(step => {
            const isDone = state[step] === 'done';
            const meta = STEP_META[step];

            if (!meta) {
              return null;
            }

            return (
              <li key={step} className="flex items-center gap-2 py-1.5">
                {isDone ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
                <span className={`flex-1 text-sm ${isDone ? 'text-muted-foreground line-through' : 'font-medium'}`}>{meta.label}</span>
                {!isDone && (
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link href={meta.href}>
                      {meta.cta}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
};

export default OnboardingReminder;
