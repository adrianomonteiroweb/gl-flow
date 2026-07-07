'use client';

import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Clock, Loader2 } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { cn } from '@workspace/ui/lib/utils';

import { getToneClasses } from '@/lib/tone-colors';

const STEPS: { title: string; detail: string; meta: string | null }[] = [
  { title: 'Proposta gerada', detail: 'Proposta comercial criada e validada automaticamente', meta: 'Automático' },
  { title: 'Validação de dados', detail: 'CPF, endereço e documentação verificados na base unificada', meta: 'Automático' },
  { title: 'Conformidade comercial', detail: 'Desconto dentro da política — aprovação automática', meta: 'Holmes (regra automática)' },
  { title: 'Aprovação do Gerente', detail: 'Validação final do gerente comercial', meta: null },
  { title: 'Liberação para faturamento', detail: 'Envio automático ao Linx após aprovação', meta: null },
];

interface ApprovalStepProps {
  status: 'pending' | 'approved';
  onBack: () => void;
  onSimulate: () => Promise<void>;
  onContinue: () => void;
  isSubmitting: boolean;
}

export const ApprovalStep = ({ status, onBack, onSimulate, onContinue, isSubmitting }: ApprovalStepProps) => {
  const approved = status === 'approved';

  // pending: 0-2 concluídos, 3 aguardando, 4 pendente. approved: todos concluídos.
  const stateFor = (index: number): 'done' | 'waiting' | 'pending' => {
    if (approved || index <= 2) {
      return 'done';
    }

    if (index === 3) {
      return 'waiting';
    }

    return 'pending';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Aprovação (Holmes)</h3>
        <p className="text-sm text-muted-foreground">Fluxo de aprovação enviado automaticamente via integração Holmes</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className={cn('gap-1', getToneClasses('success').soft)}>
          <Check className="h-3 w-3" />
          Holmes conectado
        </Badge>
        <Badge variant="secondary" className={cn('gap-1', getToneClasses(approved ? 'success' : 'info').soft)}>
          {approved ? <Check className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
          {approved ? 'Aprovado' : 'Aguardando aprovação'}
        </Badge>
      </div>

      <ol className="space-y-1">
        {STEPS.map((step, index) => {
          const state = stateFor(index);

          return (
            <li key={step.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                {state === 'done' && <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500 dark:text-emerald-400" />}
                {state === 'waiting' && <Clock className="h-6 w-6 shrink-0 text-amber-500 dark:text-amber-400" />}
                {state === 'pending' && <Circle className="h-6 w-6 shrink-0 text-muted-foreground/40" />}
                {index < STEPS.length - 1 && <div className={cn('my-1 w-0.5 flex-1', state === 'done' ? 'bg-emerald-500/60' : 'bg-border')} />}
              </div>
              <div className="pb-4">
                <p className={cn('text-sm font-medium', state === 'pending' ? 'text-muted-foreground' : 'text-foreground')}>{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
                {(step.meta || state === 'waiting') && <p className="mt-0.5 text-[11px] text-muted-foreground">{state === 'waiting' ? 'Aguardando validação do gerente comercial' : step.meta}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-0 z-10 -mx-6 mt-4 flex items-center justify-between gap-1.5 border-t bg-background px-6 py-2 sm:static sm:mt-6 sm:gap-2 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        {approved ? (
          <Button type="button" onClick={onContinue} disabled={isSubmitting} className="gap-1.5">
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={onSimulate} disabled={isSubmitting} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Simular Aprovação
          </Button>
        )}
      </div>
    </div>
  );
};
