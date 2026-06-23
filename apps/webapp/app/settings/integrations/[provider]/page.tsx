'use client';

import { useParams, notFound } from 'next/navigation';

import { PageInset } from '@/components/commons/page-inset';
import { SettingsGuard } from '@/components/auth/settings-guard';
import { IntegrationDetail } from '@/components/integrations/integration-detail';
import { getIntegration } from '@/lib/integrations/registry';

export default function IntegrationDetailPage() {
  const params = useParams();
  const provider = params.provider as string;

  if (!getIntegration(provider)) {
    notFound();
  }

  return (
    <SettingsGuard>
      <PageInset title="Apps e Integrações">
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <IntegrationDetail provider={provider} />
        </div>
      </PageInset>
    </SettingsGuard>
  );
}
