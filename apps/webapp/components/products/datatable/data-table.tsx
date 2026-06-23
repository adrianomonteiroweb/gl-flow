'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { RefreshCwIcon } from 'lucide-react';
import { columns } from './columns';
import { Datatable } from '@workspace/ui/components/datatable';
import { getProducts, autoSyncProducts } from '@/actions/products';
import { CreateProductButton } from '@/components/products/create-button';
import { SearchInput } from '@workspace/ui/components/input-search';

export function ProductsDataTable() {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const res = await getProducts();
      if (res.success) {
        setAllProducts(res.data || []);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData();
    document.addEventListener('products:updated', handler);
    return () => document.removeEventListener('products:updated', handler);
  }, [fetchData]);

  useEffect(() => {
    let active = true;

    const autoSync = async () => {
      setIsSyncing(true);
      try {
        const result = await autoSyncProducts();
        if (active && result.success && !('skipped' in result && result.skipped)) {
          document.dispatchEvent(new Event('products:updated'));
        }
      } finally {
        if (active) setIsSyncing(false);
      }
    };

    autoSync();
    return () => {
      active = false;
    };
  }, []);

  const filteredData = search
    ? allProducts.filter((p) => {
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s);
      })
    : allProducts;

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const handlePageChange = (pageIndex: number) => {
    table.setPageIndex(pageIndex);
  };

  const handlePageSizeChange = (pageSize: number) => {
    table.setPageSize(pageSize);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="hidden sm:block text-lg font-semibold text-gray-900">Produtos</h2>
        <div className="ml-auto flex items-center gap-2">
          {isSyncing && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <RefreshCwIcon className="h-4 w-4 animate-spin" />
              Sincronizando...
            </span>
          )}
          <CreateProductButton />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="w-64 max-w-full">
          <SearchInput
            onSearch={setSearch}
            placeholder="Pesquisar..."
            debounceMs={300}
          />
        </div>
      </div>

      <Datatable.Root>
        <Datatable.Header table={table} />
        <Datatable.Body table={table} columns={columns} loading={loading}>
          Nenhum produto encontrado.
        </Datatable.Body>
      </Datatable.Root>
      <Datatable.Pagination table={table} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
    </div>
  );
}
