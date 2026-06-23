'use client';

import { PageInset } from '@/components/commons/page-inset';
import { SettingsGuard } from '@/components/auth/settings-guard';
import { IntegrationsCatalog } from '@/components/integrations/integrations-catalog';

export default function IntegrationsPage() {
  return (
    <SettingsGuard>
      <PageInset title="Apps e Integrações">
        <div className="mx-auto w-full max-w-5xl px-4 py-8">
          <IntegrationsCatalog />
        </div>
      </PageInset>
    </SettingsGuard>
  );
}
