'use client';

import { SearchInput } from '@workspace/ui/components/input-search';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

export function DataTableToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getParams = () => {
    const q = searchParams.get('q') || '';

    return { q };
  };

  const { q }: any = getParams();

  const updateSearchParams = (newParams: any = {}) => {
    const params: any = getParams();

    router.push(
      '?' +
        new URLSearchParams({
          ...params,
          ...newParams,
        }).toString()
    );
  };

  const handleSearch = (value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      updateSearchParams({ q: value });
    }, 500);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="w-64 max-w-full">
          <SearchInput value={q} onSearch={handleSearch} className="w-full" debounceMs={500} />
        </div>
      </div>
    </div>
  );
}
