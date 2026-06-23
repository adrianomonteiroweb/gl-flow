'use client';

import { useState } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { updateLeadAddress } from '@/actions/leads';
import { AddressData } from '@/repositories/types';

interface LeadAddressFieldProps {
  leadId: string;
  icon: React.ReactNode;
  label: string;
  fieldType: keyof AddressData;
  value: string | undefined;
  currentAddress: AddressData;
  onSuccess: (fieldType: keyof AddressData, newValue: string | undefined) => void;
}

export const LeadAddressField = ({ leadId, icon, label, fieldType, value, currentAddress, onSuccess }: LeadAddressFieldProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setInputValue(value || '');
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue(value || '');
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const mergedAddress: AddressData = {
        ...currentAddress,
        [fieldType]: inputValue || undefined,
      };

      const result = await updateLeadAddress(leadId, mergedAddress);

      if (result.success) {
        onSuccess(fieldType, inputValue || undefined);
        setIsEditing(false);
      } else {
        setError(result.error || 'Erro ao atualizar');
      }
    } catch (err) {
      setError('Erro ao atualizar');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().slice(0, 2);
    setInputValue(raw);
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-gray-400 mt-2">{icon}</div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-gray-500">{label}</p>
            <Input
              type="text"
              placeholder={label}
              value={inputValue}
              onChange={fieldType === 'state' ? handleStateChange : e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-8"
              maxLength={fieldType === 'state' ? 2 : undefined}
              autoFocus
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleSave}
              disabled={isLoading}
              type="button">
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
              onClick={handleCancel}
              disabled={isLoading}
              type="button">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-md transition-colors hover:bg-gray-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <div className="flex-shrink-0 text-gray-400 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        {value ? <p className="text-sm text-gray-700 truncate">{value}</p> : <p className="text-sm text-gray-500">—</p>}
      </div>
      {isHovered && (
        <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-1" onClick={handleEdit} type="button">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
