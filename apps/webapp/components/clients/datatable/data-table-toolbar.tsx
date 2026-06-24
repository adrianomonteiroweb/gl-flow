'use client';

import type { ReactNode } from 'react';
import { SearchInput } from '@workspace/ui/components/input-search';
import { Switch } from '@workspace/ui/components/switch';
import { Label } from '@workspace/ui/components/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { useSessionContext } from '@/contexts/session';
import { canAccessSettings } from '@/lib/auth/permissions';

interface DataTableToolbarProps {
  actionSlot?: ReactNode;
}

export function DataTableToolbar({ actionSlot }: DataTableToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useSessionContext();

  const showInactiveToggle = canAccessSettings(user?.role);

  const getParams = () => {
    const q = searchParams.get('q') || '';
    const inactive = searchParams.get('inactive') || '';
    return { q, inactive };
  };

  const { q, inactive }: any = getParams();

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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SearchInput value={q} onSearch={handleSearch} className="w-full lg:max-w-64" debounceMs={500} />
        {actionSlot}
      </div>

      {showInactiveToggle && (
        <div className="flex items-center space-x-2">
          <Switch id="show-inactive" checked={inactive === '1'} onCheckedChange={handleInactiveToggle} />
          <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
            Mostrar inativos
          </Label>
        </div>
      )}
    </div>
  );
}
