'use client';

import { ClientsDataTable } from '@/components/clients/datatable/data-table';
import { PageInset } from '@/components/commons/page-inset';

export default function LeadsPage() {
  return (
    <PageInset title="Leads">
      <div className="px-4">
        <ClientsDataTable mode="leads" />
      </div>
    </PageInset>
  );
}
