'use client';

import { forwardRef, useRef, useEffect, useState, InputHTMLAttributes, ChangeEvent, KeyboardEvent } from 'react';
import { SearchIcon } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';
import { Input } from '@workspace/ui/components/input';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  controlled?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, placeholder = 'Pesquisar...', onSearch, onClear, debounceMs = 300, controlled = false, ...props }, ref) => {
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const [localValue, setLocalValue] = useState(value || '');

    const currentValue = controlled ? value : localValue;

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
      const newValue = event.target.value;

      if (!controlled) {
        setLocalValue(newValue);
      }

      if (onChange) {
        onChange(event);
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onSearch?.(newValue);
      }, debounceMs);
    };

    const handleClear = (): void => {
      if (!controlled) {
        setLocalValue('');
      }
      onClear?.();
      onSearch?.('');
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const searchValue = controlled ? value || '' : localValue;
        onSearch?.(searchValue);
      }

      if (event.key === 'Escape') {
        handleClear();
      }
    };

    useEffect(() => {
      if (controlled) {
        setLocalValue(value || '');
      }
    }, [value, controlled]);

    useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, []);

    return (
      <div className="relative flex items-center w-full">
        <SearchIcon className="absolute left-3 h-4 w-4 shrink-0 opacity-50 pointer-events-none z-10" />

        <Input
          ref={ref}
          type="search"
          placeholder={placeholder}
          value={currentValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={cn(
            'pl-10 pr-4 border rounded-md transition-all duration-200 ease-in-out',
            'focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'w-full',
            currentValue && 'pr-10',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
