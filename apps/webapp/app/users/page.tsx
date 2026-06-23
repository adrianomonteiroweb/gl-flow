'use client';

import { UsersDataTable } from '@/components/users/datatable/data-table';
import { PageInset } from '@/components/commons/page-inset';
import { SettingsGuard } from '@/components/auth/settings-guard';

export default function UsersPage() {
  return (
    <SettingsGuard>
      <PageInset title="Usuários e Permissões">
        <div className="px-4">
          <UsersDataTable />
        </div>
      </PageInset>
    </SettingsGuard>
  );
}
