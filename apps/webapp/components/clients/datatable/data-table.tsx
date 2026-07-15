'use client';

import { columns } from './columns';
import { DataTableToolbar } from './data-table-toolbar';
import { Datatable } from '@workspace/ui/components/datatable';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from '@/hooks/use-search-params';
import useServerPaginationTable from '@/hooks/use-server-pagination-table';
import { getClients } from '@/actions/clients';
import { CreateClientButton } from '@/components/clients/create-button';
import { PendingClientsList } from '@/components/clients/pending-clients-list';
import { OfflineIndicator } from '@/components/commons/offline-indicator';
import { ClientsEmptyState } from '@/components/clients/clients-empty-state';

interface ClientsDataTableProps {
  mode?: 'leads' | 'clients';
}

export function ClientsDataTable({ mode = 'leads' }: ClientsDataTableProps) {
  const [response, setResponse] = useState({ data: [], status: 200, count: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const { params } = useSearchParams();

  const isLeadsMode = mode === 'leads';

  const q = params.q || '';
  const page = Number(params.page) || 1;
  const page_size = Number(params.page_size) || 50;
  const includeInactive = params.inactive === '1';
  const type = (params.type as 'all' | 'quick_lead' | 'complete') || 'all';

  const fetchData = useCallback(async () => {
    if (!navigator.onLine && !isLeadsMode) {
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const res = await getClients({
        q,
        page,
        page_size,
        includeInactive,
        type: isLeadsMode ? type : 'all',
        source: isLeadsMode ? 'lead' : 'integration',
      });

      setResponse(res as any);
      setError(false);
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
      setError(true);
      setResponse({ data: [], status: 500, count: 0 });
    } finally {
      setLoading(false);
    }
  }, [q, page, page_size, includeInactive, type, isLeadsMode]);

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

  const title = isLeadsMode ? 'Leads' : 'Clientes';

  let emptyMessage: React.ReactNode;
  if (isLeadsMode) {
    emptyMessage = 'Nenhum lead encontrado.';
  } else {
    const emptyStateType = error ? 'error' : 'no-integration';
    emptyMessage = <ClientsEmptyState type={emptyStateType} onRetry={error ? fetchData : undefined} />;
  }

  return (
    <div className="space-y-4">
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <OfflineIndicator />
        </div>
        {isLeadsMode && <CreateClientButton label="Novo Lead" />}
      </div>

      <DataTableToolbar
        actionSlot={isLeadsMode ? <div className="lg:hidden"><CreateClientButton label="Novo Lead" /></div> : undefined}
        showTypeFilter={isLeadsMode}
      />

      <OfflineIndicator className="lg:hidden" />

      {isLeadsMode && <PendingClientsList />}

      <Datatable.Responsive table={table} columns={columns} loading={loading} emptyMessage={emptyMessage} />
      <Datatable.Pagination table={table} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
    </div>
  );
}
