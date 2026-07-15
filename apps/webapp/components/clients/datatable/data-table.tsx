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
  const { params } = useSearchParams();

  const isLeadsMode = mode === 'leads';

  const q = params.q || '';
  const page = Number(params.page) || 1;
  const page_size = Number(params.page_size) || 50;
  const includeInactive = params.inactive === '1';
  const type = (params.type as 'all' | 'quick_lead' | 'complete') || 'all';

  const fetchData = useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }

    setLoading(true);

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
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
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
  const emptyMessage = isLeadsMode ? 'Nenhum lead encontrado.' : <ClientsEmptyState />;

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
