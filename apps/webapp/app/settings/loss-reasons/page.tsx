'use client';

import { PageInset } from '@/components/commons/page-inset';
import { LossReasonsList } from '@/components/loss-reasons/loss-reasons-list';
import { SettingsGuard } from '@/components/auth/settings-guard';

export default function LossReasonsPage() {
  return (
    <SettingsGuard>
      <PageInset title="Motivos de Perda">
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <LossReasonsList />
        </div>
      </PageInset>
    </SettingsGuard>
  );
}
