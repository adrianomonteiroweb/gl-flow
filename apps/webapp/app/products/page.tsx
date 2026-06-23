'use client';

import { ProductsDataTable } from '@/components/products/datatable/data-table';
import { PageInset } from '@/components/commons/page-inset';
import { SettingsGuard } from '@/components/auth/settings-guard';

export default function ProductsPage() {
  return (
    <SettingsGuard>
      <PageInset title="Produtos">
        <div className="px-4">
          <ProductsDataTable />
        </div>
      </PageInset>
    </SettingsGuard>
  );
}
