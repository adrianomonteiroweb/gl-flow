'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bot } from 'lucide-react';

import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { resumeAutomation } from '@/actions/automation';

interface AutomationStatusBadgeProps {
  chat: any;
}

export const AutomationStatusBadge = ({ chat }: AutomationStatusBadgeProps) => {
  const [isPaused, setIsPaused] = useState<boolean>(chat.conv_state === 'BOT_PAUSED');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsPaused(chat.conv_state === 'BOT_PAUSED');
  }, [chat.conv_state]);

  if (!chat.conv_state) {
    return null;
  }

  const handleResume = (): void => {
    startTransition(async () => {
      await resumeAutomation(chat.id);
      setIsPaused(false);
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div role="group" aria-label="Automação do chat" className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Bot className="h-3.5 w-3.5" aria-hidden="true" />
          Automação:
        </span>

        {isPaused ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" aria-label="Estado: pausada" className="border-yellow-400 text-yellow-600 bg-yellow-50">
                  Pausada
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Respostas automáticas suspensas
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResume}
                  disabled={isPending}
                  aria-label="Retomar automação"
                  className="h-7 text-xs">
                  {isPending ? 'Retomando...' : 'Retomar'}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Retomar respostas automáticas
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" aria-label="Estado: ativa" className="border-green-400 text-green-600 bg-green-50">
                Ativa
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Respondendo automaticamente
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
