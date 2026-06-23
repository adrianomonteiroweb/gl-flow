'use client';

import { useState } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { updateLeadInfo } from '@/actions/leads';

interface LeadInfoFieldProps {
  leadId: string;
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
  href?: string;
  fieldType: 'name' | 'email' | 'phone';
  onSuccess?: (fieldType: 'name' | 'email' | 'phone', newValue: string | undefined) => void;
}

export const LeadInfoField = ({ leadId, icon, label, value, href, fieldType, onSuccess }: LeadInfoFieldProps) => {
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
      const updateData =
        fieldType === 'name'
          ? { name: inputValue || undefined }
          : fieldType === 'email'
            ? { email: inputValue || undefined }
            : { phone: inputValue || undefined };

      const result = await updateLeadInfo(leadId, updateData);

      if (result.success) {
        onSuccess?.(fieldType, inputValue || undefined);
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

  if (isEditing) {
    return (
      <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-gray-400 mt-2">{icon}</div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-gray-500">{label}</p>
            <Input
              type={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}
              placeholder={label}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-8"
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
        {value ? (
          href ? (
            <a href={href} className="text-sm text-blue-600 hover:underline truncate block">
              {value}
            </a>
          ) : (
            <p className="text-sm text-gray-700 truncate">{value}</p>
          )
        ) : (
          <p className="text-sm text-gray-500">—</p>
        )}
      </div>
      {isHovered && (
        <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-1" onClick={handleEdit} type="button">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
