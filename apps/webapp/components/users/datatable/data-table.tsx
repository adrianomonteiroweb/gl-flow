'use client';

import { columns } from './columns';
import { DataTableToolbar } from './data-table-toolbar';
import { Datatable } from '@workspace/ui/components/datatable';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from '@/hooks/use-search-params';
import useServerPaginationTable from '@/hooks/use-server-pagination-table';
import { getUsers } from '@/actions/users';
import { CreateUserButton } from '@/components/users/create-button';

export function UsersDataTable() {
  const [response, setResponse] = useState({ data: [], status: 200, count: 0 });
  const [loading, setLoading] = useState(false);
  const { params } = useSearchParams();

  const q = params.q || '';
  const page = Number(params.page) || 1;
  const page_size = Number(params.page_size) || 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    getUsers({ q, page, page_size })
      .then((res: any) => setResponse(res))
      .finally(() => setLoading(false));
  }, [q, page, page_size]);

  useEffect(() => {
    fetchData();
    document.addEventListener('users:updated', fetchData);
    return () => {
      document.removeEventListener('users:updated', fetchData);
    };
  }, [fetchData]);

  const { table, handlePageChange, handlePageSizeChange } = useServerPaginationTable({
    data: response.data || [],
    count: response.count || 0,
    columns,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="hidden sm:block text-lg font-semibold text-foreground">Usuários</h2>
        <div className="ml-auto">
          <CreateUserButton />
        </div>
      </div>
      <DataTableToolbar />
      <Datatable.Responsive table={table} columns={columns} loading={loading} emptyMessage="Nenhum usuário encontrado." />
      <Datatable.Pagination table={table} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
    </div>
  );
}
