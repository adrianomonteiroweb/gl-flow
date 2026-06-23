'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCoreRowModel, useReactTable, getPaginationRowModel } from '@tanstack/react-table';
import { columns } from './columns';
import { Datatable } from '@workspace/ui/components/datatable';
import { getProposalTemplates } from '@/actions/proposal-templates';
import { CreateTemplateButton } from '@/components/proposal-templates/create-button';
import { SeedDefaultTemplateButton } from '@/components/proposal-templates/seed-default-button';
import { SearchInput } from '@workspace/ui/components/input-search';

export function ProposalTemplatesDataTable() {
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const res = await getProposalTemplates();
      if (res.success) {
        setAllTemplates(res.data || []);
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
    document.addEventListener('proposal-templates:updated', handler);
    return () => document.removeEventListener('proposal-templates:updated', handler);
  }, [fetchData]);

  const filteredData = search
    ? allTemplates.filter(t => {
        const s = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(s) ||
          (t.description ?? '').toLowerCase().includes(s) ||
          (t.category ?? '').toLowerCase().includes(s)
        );
      })
    : allTemplates;

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  const handlePageChange = (pageIndex: number) => table.setPageIndex(pageIndex);
  const handlePageSizeChange = (pageSize: number) => table.setPageSize(pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="hidden text-lg font-semibold text-gray-900 sm:block">Modelos de Proposta</h2>
        <div className="ml-auto flex items-center gap-2">
          <SeedDefaultTemplateButton />
          <CreateTemplateButton />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="w-64 max-w-full">
          <SearchInput onSearch={setSearch} placeholder="Pesquisar..." debounceMs={300} />
        </div>
      </div>

      <Datatable.Root>
        <Datatable.Header table={table} />
        <Datatable.Body table={table} columns={columns} loading={loading}>
          Nenhum modelo encontrado.
        </Datatable.Body>
      </Datatable.Root>
      <Datatable.Pagination table={table} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
    </div>
  );
}
