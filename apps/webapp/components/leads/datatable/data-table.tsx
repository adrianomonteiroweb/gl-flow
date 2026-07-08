'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Datatable } from '@workspace/ui/components/datatable';
import { useSearchParams } from '@/hooks/use-search-params';
import useServerPaginationTable from '@/hooks/use-server-pagination-table';
import { getLeads } from '@/actions/leads';
import { LeadDetailsSurface } from '@/components/leads/lead-details-surface';

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

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<string | undefined>(undefined);

  const openDetails = useCallback((row: any, tab?: string): void => {
    const chatId = row?.chat?.id;

    if (chatId) {
      sessionStorage.setItem(`leads-read-${chatId}`, new Date().toISOString());
    }

    setSelectedLead(row);
    setDetailsTab(tab);
    setDetailsOpen(true);
  }, []);

  const columns = useMemo(() => createColumns(loadedAt, row => openDetails(row, 'tasks')), [loadedAt, openDetails]);

  const q = params.q || '';
  const page = Number(params.page) || 1;
  const page_size = Number(params.page_size) || 50;
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
    openDetails(row);
  };

  const { table, handlePageChange, handlePageSizeChange } = useServerPaginationTable({
    data: response.data || [],
    count: response.count || 0,
    columns,
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar />
      <Datatable.Responsive
        table={table}
        columns={columns}
        loading={loading}
        onRowClick={handleRowClick}
        emptyMessage="Nenhum lead encontrado."
      />
      <Datatable.Pagination table={table} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />

      <LeadDetailsSurface item={selectedLead} tab={detailsTab} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div>
  );
}
