'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Datatable } from '@workspace/ui/components/datatable';
import { useSearchParams } from '@/hooks/use-search-params';
import useServerPaginationTable from '@/hooks/use-server-pagination-table';
import { getLeads } from '@/actions/leads';

import { createColumns } from './columns';
import { DataTableToolbar } from './data-table-toolbar';

interface LeadsDataTableProps {
  loadedAt: string;
  pipelineIds?: string[];
}

export function LeadsDataTable({ loadedAt, pipelineIds }: LeadsDataTableProps) {
  const [response, setResponse] = useState({ data: [], status: 200, count: 0 });
  const [loading, setLoading] = useState(false);
  const { params } = useSearchParams();

  const router = useRouter();

  const columns = useMemo(() => createColumns(loadedAt), [loadedAt]);

  const q = params.q || '';
  const page = Number(params.page) || 1;
  const page_size = Number(params.page_size) || 10;
  const steps = params.steps ? String(params.steps).split(',').filter(Boolean) : [];
  const taskAlerts = params.taskAlerts ? String(params.taskAlerts).split(',').filter(Boolean) : [];

  const fetchData = useCallback(async () => {
    setLoading(true);
    getLeads({ q, page, page_size, steps, taskAlerts, pipelineIds })
      .then((res: any) => setResponse(res))
      .finally(() => setLoading(false));
  }, [q, page, page_size, steps.join(','), taskAlerts.join(','), pipelineIds?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 60000);
    document.addEventListener('leads:updated', fetchData);

    return () => {
      clearInterval(interval);
      document.removeEventListener('leads:updated', fetchData);
    };
  }, [fetchData]);

  const handleRowClick = (row: any): void => {
    const chatId = row.chat?.id;

    if (chatId) {
      sessionStorage.setItem(`leads-read-${chatId}`, new Date().toISOString());
      router.push(`/chats/${chatId}`);
    }
  };

  const { table, handlePageChange, handlePageSizeChange } = useServerPaginationTable({
    data: response.data || [],
    count: response.count || 0,
    columns,
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar />
      <Datatable.Root>
        <Datatable.Header table={table} />
        <Datatable.Body table={table} columns={columns} loading={loading} onRowClick={handleRowClick}>
          Nenhum lead encontrado.
        </Datatable.Body>
      </Datatable.Root>
      <Datatable.Pagination table={table} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
    </div>
  );
}
