'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Separator } from '@workspace/ui/components/separator';
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { EyeIcon, User, Mail, Phone } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { DateFormatter } from '@workspace/utils';
import { cpfOrCnpj } from '@workspace/utils/text';
import { LeadInfoField } from '@/components/leads/lead-info-field';
import { LeadAddressSection } from '@/components/leads/lead-address-section';
import { LeadDetailedInfo } from '@/components/leads/lead-detailed-info';
import { AddressData, PartnerData } from '@/repositories/types';
import { maritalStatusLabel } from '@/lib/clients/marital-status';
import { getToneClasses } from '@/lib/tone-colors';

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) {
    return null;
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
};

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

  const isCompany = clientData?.person_type === 'pj';
  const inscricoes = (clientData?.payload as { inscricoes?: { municipal?: string; estadual?: string } } | undefined)?.inscricoes;
  const partnersList = (Array.isArray(clientData?.partners) ? clientData.partners : []) as PartnerData[];

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
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    clientData?.deleted_at ? getToneClasses('neutral').soft : getToneClasses('success').soft
                  )}>
                  {clientData?.deleted_at ? 'Inativo' : 'Ativo'}
                </span>
                <Badge variant="secondary" className={getToneClasses('info').soft}>
                  {isCompany ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Dados cadastrais</h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label={isCompany ? 'CNPJ' : 'CPF'} value={clientData?.document ? cpfOrCnpj(String(clientData.document)) : null} />
              {isCompany && <InfoRow label="Nome Fantasia" value={clientData?.trade_name} />}
              {isCompany ? (
                <InfoRow label="Data de abertura" value={clientData?.founding_date ? DateFormatter.date(clientData.founding_date) : null} />
              ) : (
                <InfoRow label="Nascimento" value={clientData?.birth_date ? DateFormatter.date(clientData.birth_date) : null} />
              )}
              {!isCompany && <InfoRow label="Estado civil" value={clientData?.marital_status ? maritalStatusLabel(clientData.marital_status) : null} />}
              {isCompany && <InfoRow label="Inscrição municipal" value={inscricoes?.municipal} />}
              {isCompany && <InfoRow label="Inscrição estadual" value={inscricoes?.estadual} />}
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

          {isCompany && partnersList.length > 0 && (
            <>
              <Separator />

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Sócios</h4>
                <div className="space-y-3">
                  {partnersList.map((partner, index) => (
                    <div key={`${partner.document}-${index}`} className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium text-foreground">{partner.name || `Sócio ${index + 1}`}</p>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <InfoRow label="CPF" value={partner.document ? cpfOrCnpj(String(partner.document)) : null} />
                        <InfoRow label="Telefone" value={partner.phone} />
                        <InfoRow label="E-mail" value={partner.email} />
                        <InfoRow label="Nascimento" value={partner.birth_date ? DateFormatter.date(partner.birth_date) : null} />
                        <InfoRow label="Estado civil" value={partner.marital_status ? maritalStatusLabel(partner.marital_status) : null} />
                        <InfoRow label="Possui CNH" value={partner.has_cnh ? 'Sim' : 'Não'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

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
