'use client';

import { updateLeadAddress } from '@/actions/leads';
import { AddressData } from '@/repositories/types';

import { LeadEditableField } from './lead-editable-field';

interface LeadAddressFieldProps {
  leadId: string;
  icon: React.ReactNode;
  label: string;
  fieldType: keyof AddressData;
  value: string | undefined;
  currentAddress: AddressData;
  className?: string;
  onSuccess: (fieldType: keyof AddressData, newValue: string | undefined) => void;
}

export const LeadAddressField = ({ leadId, icon, label, fieldType, value, currentAddress, className, onSuccess }: LeadAddressFieldProps) => {
  const handleSave = async (next: string | undefined) => {
    const mergedAddress: AddressData = {
      ...currentAddress,
      [fieldType]: next,
    };

    const result = await updateLeadAddress(leadId, mergedAddress);

    if (result.success) {
      onSuccess(fieldType, next);
    }

    return result;
  };

  return (
    <LeadEditableField
      className={className}
      icon={icon}
      label={label}
      value={value}
      maxLength={fieldType === 'state' ? 2 : undefined}
      transform={fieldType === 'state' ? raw => raw.toUpperCase().slice(0, 2) : undefined}
      onSave={handleSave}
    />
  );
};
