'use client';

import { ProposalTemplatesDataTable } from '@/components/proposal-templates/datatable/data-table';
import { PageInset } from '@/components/commons/page-inset';
import { SettingsGuard } from '@/components/auth/settings-guard';

export default function ProposalTemplatesPage() {
  return (
    <SettingsGuard>
      <PageInset title="Modelos de Proposta">
        <div className="px-4">
          <ProposalTemplatesDataTable />
        </div>
      </PageInset>
    </SettingsGuard>
  );
}
