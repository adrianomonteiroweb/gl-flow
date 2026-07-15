'use client';

import type { ReactNode } from 'react';
import { SearchInput } from '@workspace/ui/components/input-search';
import { Switch } from '@workspace/ui/components/switch';
import { Label } from '@workspace/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { useSessionContext } from '@/contexts/session';
import { canAccessSettings } from '@/lib/auth/permissions';

interface DataTableToolbarProps {
  actionSlot?: ReactNode;
  showTypeFilter?: boolean;
}

export function DataTableToolbar({ actionSlot, showTypeFilter = true }: DataTableToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useSessionContext();

  const showInactiveToggle = canAccessSettings(user?.role);

  const getParams = () => {
    const q = searchParams.get('q') || '';
    const inactive = searchParams.get('inactive') || '';
    const type = searchParams.get('type') || 'all';
    return { q, inactive, type };
  };

  const { q, inactive, type }: any = getParams();

  const updateSearchParams = (new_params: any = {}) => {
    const params: any = getParams();
    const merged = { ...params, ...new_params };

    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (value !== '' && value !== undefined) {
        filtered[key] = String(value);
      }
    }

    router.push('?' + new URLSearchParams(filtered).toString());
  };

  const handleSearch = (value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateSearchParams({ q: value, page: '' });
    }, 500);
  };

  const handleInactiveToggle = (checked: boolean) => {
    updateSearchParams({ inactive: checked ? '1' : '', page: '' });
  };

  const handleTypeChange = (value: string) => {
    updateSearchParams({ type: value === 'all' ? '' : value, page: '' });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SearchInput value={q} onSearch={handleSearch} className="w-full lg:max-w-64" debounceMs={500} />
        {actionSlot}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {showTypeFilter && (
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cadastros</SelectItem>
              <SelectItem value="quick_lead">Apenas rápidos</SelectItem>
              <SelectItem value="complete">Apenas qualificados</SelectItem>
            </SelectContent>
          </Select>
        )}

        {showInactiveToggle && (
          <div className="flex items-center space-x-2">
            <Switch id="show-inactive" checked={inactive === '1'} onCheckedChange={handleInactiveToggle} />
            <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
              Mostrar inativos
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}
