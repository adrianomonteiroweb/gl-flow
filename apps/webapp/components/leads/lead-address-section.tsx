'use client';

import { useState } from 'react';
import { MapPin, Home, Hash, Plus, Building2, Building, Map } from 'lucide-react';
import { AddressData } from '@/repositories/types';
import { LeadAddressField } from './lead-address-field';

interface LeadAddressSectionProps {
  leadId: string;
  address: AddressData | null;
  onAddressSuccess?: (fieldType: keyof AddressData, newValue: string | undefined) => void;
}

export const LeadAddressSection = ({ leadId, address, onAddressSuccess }: LeadAddressSectionProps) => {
  const [addressData, setAddressData] = useState<AddressData>(address ?? {});

  const handleFieldSuccess = (fieldType: keyof AddressData, newValue: string | undefined) => {
    setAddressData(prev => ({
      ...prev,
      [fieldType]: newValue,
    }));
    onAddressSuccess?.(fieldType, newValue);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-foreground text-sm font-semibold">Endereço</h4>
      <div className="grid grid-cols-2 gap-3">
        <LeadAddressField
          leadId={leadId}
          icon={<MapPin className="h-5 w-5" />}
          label="CEP"
          fieldType="zipCode"
          value={addressData.zipCode}
          currentAddress={addressData}
          onSuccess={handleFieldSuccess}
        />

        <LeadAddressField
          leadId={leadId}
          icon={<Hash className="h-5 w-5" />}
          label="Número"
          fieldType="number"
          value={addressData.number}
          currentAddress={addressData}
          onSuccess={handleFieldSuccess}
        />

        <LeadAddressField
          leadId={leadId}
          icon={<Home className="h-5 w-5" />}
          label="Logradouro"
          fieldType="street"
          value={addressData.street}
          currentAddress={addressData}
          className="col-span-2"
          onSuccess={handleFieldSuccess}
        />

        <LeadAddressField
          leadId={leadId}
          icon={<Plus className="h-5 w-5" />}
          label="Complemento"
          fieldType="complement"
          value={addressData.complement}
          currentAddress={addressData}
          className="col-span-2"
          onSuccess={handleFieldSuccess}
        />

        <LeadAddressField
          leadId={leadId}
          icon={<Building2 className="h-5 w-5" />}
          label="Bairro"
          fieldType="neighborhood"
          value={addressData.neighborhood}
          currentAddress={addressData}
          className="col-span-2"
          onSuccess={handleFieldSuccess}
        />

        <LeadAddressField
          leadId={leadId}
          icon={<Building className="h-5 w-5" />}
          label="Cidade"
          fieldType="city"
          value={addressData.city}
          currentAddress={addressData}
          onSuccess={handleFieldSuccess}
        />

        <LeadAddressField
          leadId={leadId}
          icon={<Map className="h-5 w-5" />}
          label="Estado"
          fieldType="state"
          value={addressData.state}
          currentAddress={addressData}
          onSuccess={handleFieldSuccess}
        />
      </div>
    </div>
  );
};
