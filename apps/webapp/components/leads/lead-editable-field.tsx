'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { cn } from '@workspace/ui/lib/utils';

export interface LeadFieldSaveResult {
  success: boolean;
  error?: string;
}

interface LeadEditableFieldProps {
  icon?: React.ReactNode;
  label: string;
  value: string | undefined;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.ComponentProps<'input'>['inputMode'];
  placeholder?: string;
  maxLength?: number;
  transform?: (raw: string) => string;
  className?: string;
  onSave: (value: string | undefined) => Promise<LeadFieldSaveResult>;
}

/**
 * Always-visible field with per-field auto-save on blur. Mirrors the visual
 * treatment of the client form (bordered Input + Label, dark-mode aware),
 * while keeping the existing per-field server actions used in the lead modal.
 */
export const LeadEditableField = ({ icon, label, value, type = 'text', inputMode, placeholder, maxLength, transform, className, onSave }: LeadEditableFieldProps) => {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  const [inputValue, setInputValue] = useState(value ?? '');
  const [savedValue, setSavedValue] = useState(value ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFocused = useRef(false);

  useEffect(() => {
    setSavedValue(value ?? '');
    if (!isFocused.current) {
      setInputValue(value ?? '');
    }
  }, [value]);

  const commit = async () => {
    const next = inputValue.trim();

    if (next === savedValue.trim()) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const result = await onSave(next || undefined);

      if (result.success) {
        setSavedValue(next);
        setSaved(true);
      } else {
        setError(result.error || 'Erro ao atualizar');
      }
    } catch {
      setError('Erro ao atualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setError(null);
    setInputValue(transform ? transform(event.target.value) : event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setInputValue(savedValue);
      setError(null);
      event.currentTarget.blur();
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={fieldId} className="text-muted-foreground text-xs font-medium">
        {icon && (
          <span className="[&_svg]:size-3.5" aria-hidden="true">
            {icon}
          </span>
        )}
        {label}
      </Label>
      <div className="relative">
        <Input
          id={fieldId}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder ?? label}
          value={inputValue}
          maxLength={maxLength}
          disabled={isSaving}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onFocus={() => {
            isFocused.current = true;
            setSaved(false);
          }}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            isFocused.current = false;
            commit();
          }}
          className="pr-9"
        />
        {isSaving && <Loader2 aria-hidden="true" className="text-muted-foreground absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin" />}
        {!isSaving && saved && <Check aria-hidden="true" className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" />}
      </div>
      {error && (
        <p id={errorId} className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
};
