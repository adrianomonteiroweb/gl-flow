'use client';

import { columns } from './columns';
import { DataTableToolbar } from './data-table-toolbar';
import { Datatable } from '@workspace/ui/components/datatable';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from '@/hooks/use-search-params';
import useServerPaginationTable from '@/hooks/use-server-pagination-table';
import { getClients } from '@/actions/clients';
import { CreateClientButton } from '@/components/clients/create-button';

export function ClientsDataTable() {
  const [response, setResponse] = useState({ data: [], status: 200, count: 0 });
  const [loading, setLoading] = useState(false);
  const { params } = useSearchParams();

  const q = params.q || '';
  const page = Number(params.page) || 1;
  const page_size = Number(params.page_size) || 10;
  const includeInactive = params.inactive === '1';

  const fetchData = useCallback(async () => {
    setLoading(true);
    getClients({ q, page, page_size, includeInactive })
      .then((res: any) => setResponse(res))
      .finally(() => setLoading(false));
  }, [q, page, page_size, includeInactive]);

  useEffect(() => {
    fetchData();
    document.addEventListener('clients:updated', fetchData);
    return () => {
      document.removeEventListener('clients:updated', fetchData);
    };
  }, [fetchData]);

  const { table, handlePageChange, handlePageSizeChange } = useServerPaginationTable({
    data: response.data || [],
    count: response.count || 0,
    columns,
    enableRowSelection: false,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="hidden sm:block text-lg font-semibold text-gray-900">Clientes</h2>
        <div className="ml-auto flex items-center gap-2">
          <CreateClientButton />
        </div>
      </div>

      <DataTableToolbar />

      <Datatable.Root>
        <Datatable.Header table={table} />
        <Datatable.Body table={table} columns={columns} loading={loading}>
          Nenhum cliente encontrado.
        </Datatable.Body>
      </Datatable.Root>
      <Datatable.Pagination table={table} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
    </div>
  );
}
