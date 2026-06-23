'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams as useNextSearchParams } from 'next/navigation';
import { Mail, Phone, Info, History, User, MapPinIcon, FileText, ClipboardCheck } from 'lucide-react';

import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { cn } from '@workspace/ui/lib/utils';
import { LeadProposalsSection } from '@/components/proposal-templates/lead/lead-proposals-section';
import { AddressData } from '@/repositories/types';
import { getLeadTasks } from '@/actions/tasks';
import { getLeadTaskAlert, leadTaskAlertConfig, type TaskLike } from '@/utils/task-status';

import { LeadInfoField } from './lead-info-field';
import { LeadAddressSection } from './lead-address-section';
import { LeadDetailedInfo } from './lead-detailed-info';
import { LeadTasksSection } from './lead-tasks-section';
import { LeadTimelineSection } from './lead-timeline-section';

export type LeadFieldChange =
  | { kind: 'name' | 'email' | 'phone'; value: string | undefined }
  | { kind: 'loss_reason'; value: string | null }
  | { kind: 'address'; field: keyof AddressData; value: string | undefined };

interface LeadDetailsContentProps {
  lead: any;
  chatId?: string;
  variant?: 'sidebar' | 'embedded';
  defaultTab?: string;
  onLeadChange?: (change: LeadFieldChange) => void;
}

const VALID_TABS = ['about', 'share', 'info', 'history', 'tasks', 'proposals'];

export const LeadDetailsContent = ({ lead, chatId, variant = 'sidebar', defaultTab, onLeadChange }: LeadDetailsContentProps) => {
  const initialTab = defaultTab && VALID_TABS.includes(defaultTab) ? defaultTab : 'about';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [leadData, setLeadData] = useState(lead);
  const [taskAlert, setTaskAlert] = useState<ReturnType<typeof getLeadTaskAlert>>(null);

  const handleTasksChanged = useCallback((tasks: TaskLike[]) => {
    setTaskAlert(getLeadTaskAlert(tasks));
  }, []);

  useEffect(() => {
    if (!lead?.id) {
      return;
    }

    let cancelled = false;

    getLeadTasks(lead.id).then(result => {
      if (cancelled || !result.success) {
        return;
      }

      setTaskAlert(getLeadTaskAlert((result.data as TaskLike[]) ?? []));
    });

    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

  useEffect(() => {
    setLeadData(lead);
  }, [lead]);

  if (!leadData) {
    return null;
  }

  const handleFieldSuccess = (fieldType: 'name' | 'email' | 'phone', newValue: string | undefined) => {
    setLeadData((prev: any) => ({
      ...prev,
      [fieldType]: newValue,
    }));

    onLeadChange?.({ kind: fieldType, value: newValue });
  };

  const handleAddressFieldSuccess = (fieldType: keyof AddressData, newValue: string | undefined) => {
    setLeadData((prev: any) => ({
      ...prev,
      address: {
        ...(prev.address ?? {}),
        [fieldType]: newValue,
      },
    }));

    onLeadChange?.({ kind: 'address', field: fieldType, value: newValue });
  };

  const handleLossReasonSuccess = (lossReason: string | null) => {
    setLeadData((prev: any) => ({ ...prev, loss_reason: lossReason }));
    onLeadChange?.({ kind: 'loss_reason', value: lossReason });
  };

  const leadName = leadData?.name || 'Sem nome';
  const leadInitials = leadName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const containerPadding = variant === 'embedded' ? 'p-4' : 'p-5';

  return (
    <div className={`${containerPadding} space-y-6`}>
      <div className="space-y-4">
        <Avatar className="h-24 w-24 mx-auto">
          <AvatarFallback className="text-lg bg-primary text-white">{leadInitials}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h3 className="text-xl font-semibold">{leadName}</h3>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TooltipProvider delayDuration={200}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="about">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <User className="h-5 w-5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Sobre
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="share">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <MapPinIcon className="h-5 w-5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Endereço
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="info">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Info className="h-5 w-5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Informações
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="history">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <History className="h-5 w-5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Histórico
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="relative inline-flex">
                    <ClipboardCheck className="h-5 w-5" />
                    {taskAlert && (
                      <span
                        className={cn('absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-white', leadTaskAlertConfig[taskAlert].dotClass)}
                      />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {taskAlert ? leadTaskAlertConfig[taskAlert].label : 'Tarefas'}
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
            <TabsTrigger value="proposals">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <FileText className="h-5 w-5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Propostas
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
          </TabsList>
        </TooltipProvider>

        <TabsContent value="about" className="space-y-6 mt-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Sobre</h4>
            <div className="space-y-2">
              <LeadInfoField
                leadId={leadData?.id}
                icon={<User className="h-5 w-5" />}
                label="Nome"
                value={leadData?.name}
                fieldType="name"
                onSuccess={handleFieldSuccess}
              />

              <LeadInfoField
                leadId={leadData?.id}
                icon={<Mail className="h-5 w-5" />}
                label="Email"
                value={leadData?.email}
                href={leadData?.email ? `mailto:${leadData.email}` : undefined}
                fieldType="email"
                onSuccess={handleFieldSuccess}
              />

              <LeadInfoField
                leadId={leadData?.id}
                icon={<Phone className="h-5 w-5" />}
                label="Telefone"
                value={leadData?.phone}
                href={leadData?.phone ? `tel:${leadData.phone}` : undefined}
                fieldType="phone"
                onSuccess={handleFieldSuccess}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="share">
          <LeadAddressSection leadId={leadData.id} address={leadData.address as AddressData | null} onAddressSuccess={handleAddressFieldSuccess} />
        </TabsContent>

        <TabsContent value="info">
          <LeadDetailedInfo leadId={leadData.id} chatId={chatId} lossReason={leadData.loss_reason} onSuccess={handleLossReasonSuccess} />
        </TabsContent>

        <TabsContent value="history">
          <LeadTimelineSection leadId={leadData.id} chatId={chatId} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <LeadTasksSection leadId={leadData.id} onTasksChanged={handleTasksChanged} />
        </TabsContent>

        <TabsContent value="proposals" className="mt-6">
          <LeadProposalsSection leadId={leadData?.id} chatId={chatId} lead={leadData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface LeadDetailsPanelProps {
  lead: any;
  chatId?: string;
}

const LeadDetailsPanelInner = ({ lead, chatId }: LeadDetailsPanelProps) => {
  const searchParams = useNextSearchParams();
  const tabParam = searchParams.get('tab');

  return (
    <ScrollArea className="flex-1">
      <LeadDetailsContent lead={lead} chatId={chatId} variant="sidebar" defaultTab={tabParam ?? undefined} />
    </ScrollArea>
  );
};

export const LeadDetailsPanel = ({ lead, chatId }: LeadDetailsPanelProps) => {
  if (!lead) {
    return null;
  }

  return (
    <div data-slot="lead-details-panel" className="w-80 border-l bg-white dark:bg-background flex flex-col h-full lead-details-panel">
      <Suspense>
        <LeadDetailsPanelInner lead={lead} chatId={chatId} />
      </Suspense>
    </div>
  );
};
