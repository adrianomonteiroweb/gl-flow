'use client';

import { VehicleCatalog } from '@/components/vehicle-catalog/vehicle-catalog';
import { PageInset } from '@/components/commons/page-inset';

export default function CatalogPage() {
  return (
    <PageInset title="Catálogo de Veículos">
      <div className="px-4">
        <VehicleCatalog />
      </div>
    </PageInset>
  );
}
