'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Separator } from '@workspace/ui/components/separator';
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { EyeIcon, User, Mail, Phone } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { DateFormatter } from '@workspace/utils';
import { LeadInfoField } from '@/components/leads/lead-info-field';
import { LeadAddressSection } from '@/components/leads/lead-address-section';
import { LeadDetailedInfo } from '@/components/leads/lead-detailed-info';
import { AddressData } from '@/repositories/types';
import { getToneClasses } from '@/lib/tone-colors';

export function DetailClientButton({ client }: any) {
  const [open, setOpen] = useState(false);
  const [clientData, setClientData] = useState(client);

  useEffect(() => {
    setClientData(client);
  }, [client]);

  const handleFieldSuccess = (fieldType: 'name' | 'email' | 'phone', newValue: string | undefined) => {
    setClientData((prev: any) => ({ ...prev, [fieldType]: newValue }));
    document.dispatchEvent(new Event('clients:updated'));
  };

  const handleAddressFieldSuccess = (fieldType: keyof AddressData, newValue: string | undefined) => {
    setClientData((prev: any) => ({
      ...prev,
      address: { ...(prev.address ?? {}), [fieldType]: newValue },
    }));
    document.dispatchEvent(new Event('clients:updated'));
  };

  const handleLossReasonSuccess = (lossReason: string | null) => {
    setClientData((prev: any) => ({ ...prev, loss_reason: lossReason }));
    document.dispatchEvent(new Event('clients:updated'));
  };

  const leadName = clientData?.name || 'Sem nome';
  const leadInitials = leadName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" title="Ver Detalhes">
          <EyeIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-primary text-primary-foreground">{leadInitials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{leadName}</h3>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  clientData?.deleted_at ? getToneClasses('neutral').soft : getToneClasses('success').soft
                )}>
                {clientData?.deleted_at ? 'Inativo' : 'Ativo'}
              </span>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Dados Pessoais</h4>
            <div className="space-y-1">
              <LeadInfoField
                leadId={clientData?.id}
                icon={<User className="h-5 w-5" />}
                label="Nome"
                value={clientData?.name}
                fieldType="name"
                onSuccess={handleFieldSuccess}
              />
              <LeadInfoField
                leadId={clientData?.id}
                icon={<Mail className="h-5 w-5" />}
                label="E-mail"
                value={clientData?.email}
                href={clientData?.email ? `mailto:${clientData.email}` : undefined}
                fieldType="email"
                onSuccess={handleFieldSuccess}
              />
              <LeadInfoField
                leadId={clientData?.id}
                icon={<Phone className="h-5 w-5" />}
                label="Telefone"
                value={clientData?.phone}
                href={clientData?.phone ? `tel:${clientData.phone}` : undefined}
                fieldType="phone"
                onSuccess={handleFieldSuccess}
              />
            </div>
          </div>

          <Separator />

          <LeadAddressSection
            leadId={clientData?.id}
            address={clientData?.address as AddressData | null}
            onAddressSuccess={handleAddressFieldSuccess}
          />

          <Separator />

          <LeadDetailedInfo
            leadId={clientData?.id}
            lossReason={clientData?.loss_reason}
            onSuccess={handleLossReasonSuccess}
          />

          <Separator />

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Datas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="text-sm text-foreground">{DateFormatter.dateTime(clientData?.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atualizado em</p>
                <p className="text-sm text-foreground">{DateFormatter.dateTime(clientData?.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
