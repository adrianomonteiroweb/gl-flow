'use client';

import { useState, useEffect } from 'react';
import { Check, CircleDot, ListChecks, MoreVertical } from 'lucide-react';

import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { Button } from '@workspace/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { Separator } from '@workspace/ui/components/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { cn } from '@workspace/ui/lib/utils';
import { updateChatStatus, updateChatStep, closeChat } from '@/actions/chats';
import { getSteps, getStatusesByStep, getAllStatuses } from '@/actions/steps';
import { getStatusLabel } from '@/utils/status-utils';
import { LeadAssigneeControl } from '@/components/leads/assignee-control';
import { LossReasonModal } from '@/components/loss-reasons/loss-reason-modal';

import { AutomationStatusBadge } from './automation-status-badge';

interface ChatHeaderProps {
  chat: any;
  lead: any;
  assignee?: any;
  /** Called after the responsible changes so the page can refresh chat data. */
  onUpdated?: () => void;
}

export const ChatHeader = ({ chat, lead, assignee, onUpdated }: ChatHeaderProps) => {
  const [currentStatus, setCurrentStatus] = useState<string>(chat.status);
  const [currentStep, setCurrentStep] = useState<string>(chat.step);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClosed, setIsClosed] = useState(!!chat.done_at);
  const [steps, setSteps] = useState<any[]>([]);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [pendingLostStatusId, setPendingLostStatusId] = useState<string | null>(null);

  const leadName = lead?.name;

  // Sync status and step when chat prop changes (e.g., after auto-status update on first message)
  useEffect(() => {
    setCurrentStatus(chat.status);
    setCurrentStep(chat.step);
    setIsClosed(!!chat.done_at);
  }, [chat.status, chat.step, chat.done_at]);
  const leadInitials = leadName
    ? leadName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  useEffect(() => {
    const fetchStepsAndStatuses = async () => {
      try {
        setIsLoadingData(true);
        const [stepsResult, statusesResult] = await Promise.all([
          getSteps(chat.pipeline_id ?? undefined),
          currentStep ? getStatusesByStep(currentStep) : getAllStatuses(),
        ]);

        if (stepsResult.success) {
          setSteps(stepsResult.data || []);
        }

        if (statusesResult.success) {
          setStatuses(statusesResult.data || []);
        }
      } catch (error) {
        console.error('Error fetching steps and statuses:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchStepsAndStatuses();
  }, [currentStep]);

  const stepOptions = steps.map(step => ({
    value: step.id,
    label: step.name,
  }));

  const statusOptions = statuses.map(status => ({
    value: status.id,
    label: status.name,
    isUniversal: status.is_universal,
  }));

  const universalStatusOptions = statusOptions.filter(s => s.isUniversal);
  const stepStatusOptions = statusOptions.filter(s => !s.isUniversal);

  const handleStatusChange = (newStatus: string): void => {
    const slug = statuses.find(s => s.id === newStatus)?.slug;

    if (slug === 'negociacao_ganha') {
      setPendingStatus(newStatus);
      return;
    }

    if (slug === 'negociacao_perdida') {
      setPendingLostStatusId(newStatus);
      return;
    }

    void executeStatusChange(newStatus);
  };

  const executeStatusChange = async (newStatus: string): Promise<void> => {
    try {
      setIsUpdating(true);
      await updateChatStatus(chat.id, newStatus, currentStep);
      setCurrentStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmStatusChange = async (): Promise<void> => {
    if (!pendingStatus) {
      return;
    }

    const status = pendingStatus;

    setPendingStatus(null);

    await executeStatusChange(status);
  };

  const handleCancelStatusChange = (): void => {
    setPendingStatus(null);
  };

  const handleStepChange = async (newStep: string) => {
    try {
      setIsUpdating(true);
      await updateChatStep(chat.id, newStep);
      setCurrentStep(newStep);

      const statusesResult = await getStatusesByStep(newStep);

      if (statusesResult.success) {
        setStatuses(statusesResult.data || []);
      }
    } catch (error) {
      console.error('Error updating step:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseChat = async () => {
    try {
      setIsUpdating(true);
      const result = await closeChat(chat.id);

      if (result.success) {
        setIsClosed(true);
      } else {
        console.error('Error closing chat:', result.error);
      }
    } catch (error) {
      console.error('Error closing chat:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentStepLabel = () => {
    const step = steps.find(s => s.id === currentStep);
    return step?.name || currentStep;
  };

  const getCurrentStatusLabel = () => {
    const status = statuses.find(s => s.id === currentStatus);

    if (status?.name) {
      return status.name;
    }

    return getStatusLabel(currentStatus);
  };

  if (isLoadingData) {
    return (
      <div className="border-b bg-white dark:bg-background p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{leadInitials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{chat.title}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{leadName}</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="border-b p-4 flex items-center justify-between bg-white">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{leadInitials}</AvatarFallback>
        </Avatar>

        <div>
          <h2 className="font-semibold">{chat.title}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{leadName}</span>
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-2">
          <AutomationStatusBadge chat={chat} />

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    disabled={isClosed}
                    aria-label={`Etapa: ${currentStep ? getCurrentStepLabel() : 'não definida'}. Clique para alterar.`}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors cursor-pointer text-xs font-medium',
                      isClosed && 'opacity-50 cursor-not-allowed'
                    )}>
                    <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Etapa: {currentStep ? getCurrentStepLabel() : '—'}</span>
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Etapa · clique para alterar
              </TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-48 p-2">
              <div className="space-y-1">
                <div className="text-sm font-semibold px-2 py-1">Alterar Etapa</div>
                {stepOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleStepChange(option.value)}
                    disabled={isUpdating}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md',
                      'hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed',
                      currentStep === option.value && 'bg-muted'
                    )}>
                    <span>{option.label}</span>
                    {currentStep === option.value && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {currentStatus && (
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      disabled={isClosed}
                      aria-label={`Status: ${getCurrentStatusLabel()}. Clique para alterar.`}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors cursor-pointer text-xs font-medium',
                        isClosed && 'opacity-50 cursor-not-allowed'
                      )}>
                      <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Status: {getCurrentStatusLabel()}</span>
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Status · clique para alterar
                </TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-60 p-2">
                <div className="space-y-1">
                  <div className="text-sm font-semibold px-2 py-1">Alterar Status</div>

                  {universalStatusOptions.length > 0 && (
                    <>
                      <div className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wide">Geral</div>
                      {universalStatusOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusChange(option.value)}
                          disabled={isUpdating}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md',
                            'hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed',
                            currentStatus === option.value && 'bg-muted'
                          )}>
                          <span>{option.label}</span>
                          {currentStatus === option.value && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </>
                  )}

                  {stepStatusOptions.length > 0 && (
                    <>
                      {universalStatusOptions.length > 0 && <Separator className="my-1" />}
                      <div className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wide">{getCurrentStepLabel()}</div>
                      {stepStatusOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusChange(option.value)}
                          disabled={isUpdating}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md',
                            'hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed',
                            currentStatus === option.value && 'bg-muted'
                          )}>
                          <span>{option.label}</span>
                          {currentStatus === option.value && <Check className="h-4 w-4" />}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <LeadAssigneeControl leadId={lead?.id} assignee={assignee ?? null} disabled={isClosed} onUpdated={onUpdated} />

          {!isClosed && (
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Mais ações">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Mais ações
                </TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-48 p-2">
                <div className="space-y-1">
                  <button
                    onClick={handleCloseChat}
                    disabled={isUpdating}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md',
                      'hover:bg-red-100 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}>
                    Encerrar Chat
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {isClosed && <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted rounded-md">Chat Encerrado</div>}
        </div>
      </TooltipProvider>

      <AlertDialog open={!!pendingStatus} onOpenChange={open => !open && handleCancelStatusChange()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              Ao confirmar, o status será alterado para &apos;Negociação Ganha&apos; uma mensagem automática será enviada ao cliente. Deseja
              continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelStatusChange}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatusChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LossReasonModal
        open={!!pendingLostStatusId}
        onOpenChange={open => {
          if (!open) setPendingLostStatusId(null);
        }}
        leadId={lead?.id}
        onConfirm={async () => {
          const statusId = pendingLostStatusId;
          setPendingLostStatusId(null);
          if (statusId) {
            await executeStatusChange(statusId);
          }
        }}
        onCancel={() => setPendingLostStatusId(null)}
      />
    </div>
  );
};
