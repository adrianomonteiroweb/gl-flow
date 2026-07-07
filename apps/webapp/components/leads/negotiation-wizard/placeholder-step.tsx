'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';

import { WizardFooter } from './wizard-footer';

interface PlaceholderStepProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  message: string;
  primaryLabel: string;
  primaryVariant?: 'continue' | 'finish';
  onBack: () => void;
  onPrimary: () => void;
  isSubmitting: boolean;
}

export const PlaceholderStep = ({ title, subtitle, icon: Icon, message, primaryLabel, primaryVariant = 'continue', onBack, onPrimary, isSubmitting }: PlaceholderStepProps) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>

    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
      <div className="rounded-lg bg-muted p-3">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>

    <WizardFooter
      left={
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      }
      right={
        <Button type="button" onClick={onPrimary} disabled={isSubmitting} className="gap-1.5">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : primaryVariant === 'finish' ? <CheckCircle2 className="h-4 w-4" /> : null}
          {primaryLabel}
          {primaryVariant === 'continue' && !isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      }
    />
  </div>
);
