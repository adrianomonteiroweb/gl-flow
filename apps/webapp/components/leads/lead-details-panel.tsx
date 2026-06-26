'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams as useNextSearchParams } from 'next/navigation';
import { Mail, Phone, Info, History, User, MapPinIcon, ClipboardCheck, type LucideIcon } from 'lucide-react';

import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { cn } from '@workspace/ui/lib/utils';
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

interface TabItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

const TAB_ITEMS: TabItem[] = [
  { value: 'about', label: 'Sobre', icon: User },
  { value: 'share', label: 'Endereço', icon: MapPinIcon },
  { value: 'info', label: 'Informações', icon: Info },
  { value: 'history', label: 'Histórico', icon: History },
  { value: 'tasks', label: 'Tarefas', icon: ClipboardCheck },
];

const VALID_TABS = TAB_ITEMS.map(tab => tab.value);

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

  const sidePadding = variant === 'embedded' ? 'px-4' : 'px-5';
  const sideMargin = variant === 'embedded' ? 'mx-4' : 'mx-5';
  const topPadding = variant === 'embedded' ? 'pt-4' : 'pt-5';
  const bottomPadding = variant === 'embedded' ? 'pb-4' : 'pb-5';

  return (
    <div className="flex h-full flex-col">
      <div className={cn('shrink-0', sidePadding, topPadding)}>
        <div className="space-y-3">
          <Avatar className="mx-auto h-16 w-16 md:h-20 md:w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">{leadInitials}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-xl font-semibold">{leadName}</h3>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col gap-0">
        <TooltipProvider delayDuration={200}>
          <TabsList className={cn('mt-4 flex h-auto min-h-12 w-auto shrink-0 gap-1', sideMargin)}>
            {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                aria-label={label}
                className="group/tab min-h-11 flex-none gap-1.5 px-2.5 data-[state=active]:flex-1"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="relative inline-flex">
                      <Icon className="h-5 w-5" />
                      {value === 'tasks' && taskAlert && (
                        <span
                          className={cn('ring-background absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2', leadTaskAlertConfig[taskAlert].dotClass)}
                        />
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {value === 'tasks' && taskAlert ? leadTaskAlertConfig[taskAlert].label : label}
                  </TooltipContent>
                </Tooltip>
                <span className="hidden truncate text-sm group-data-[state=active]/tab:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </TooltipProvider>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className={cn('pt-6', sidePadding, bottomPadding)}>
              <TabsContent value="about" className="space-y-6">
                <div>
                  <h4 className="text-foreground mb-4 text-sm font-semibold">Sobre</h4>
                  <div className="space-y-4">
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

              <TabsContent value="tasks">
                <LeadTasksSection leadId={leadData.id} onTasksChanged={handleTasksChanged} />
              </TabsContent>
            </div>
          </ScrollArea>
        </div>
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

  return <LeadDetailsContent lead={lead} chatId={chatId} variant="sidebar" defaultTab={tabParam ?? undefined} />;
};

export const LeadDetailsPanel = ({ lead, chatId }: LeadDetailsPanelProps) => {
  if (!lead) {
    return null;
  }

  return (
    <div data-slot="lead-details-panel" className="w-80 border-l bg-card flex flex-col h-full lead-details-panel">
      <Suspense>
        <LeadDetailsPanelInner lead={lead} chatId={chatId} />
      </Suspense>
    </div>
  );
};
