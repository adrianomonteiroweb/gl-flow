'use client';

import { ClientsDataTable } from '@/components/clients/datatable/data-table';
import { PageInset } from '@/components/commons/page-inset';

export default function ClientsPage() {
  return (
    <PageInset title="Clientes">
      <div className="px-4">
        <ClientsDataTable />
      </div>
    </PageInset>
  );
}
