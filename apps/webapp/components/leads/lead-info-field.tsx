'use client';

import { updateLeadInfo } from '@/actions/leads';

import { LeadEditableField } from './lead-editable-field';

interface LeadInfoFieldProps {
  leadId: string;
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
  href?: string;
  fieldType: 'name' | 'email' | 'phone';
  onSuccess?: (fieldType: 'name' | 'email' | 'phone', newValue: string | undefined) => void;
}

export const LeadInfoField = ({ leadId, icon, label, value, fieldType, onSuccess }: LeadInfoFieldProps) => {
  const type = fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text';
  const inputMode = fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : undefined;

  const handleSave = async (next: string | undefined) => {
    const updateData = fieldType === 'name' ? { name: next } : fieldType === 'email' ? { email: next } : { phone: next };

    const result = await updateLeadInfo(leadId, updateData);

    if (result.success) {
      onSuccess?.(fieldType, next);
    }

    return result;
  };

  return <LeadEditableField icon={icon} label={label} value={value} type={type} inputMode={inputMode} onSave={handleSave} />;
};
