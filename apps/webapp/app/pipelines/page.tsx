'use client';

import { LeadsContainer } from '@/components/leads/leads-container';
import { PageInset } from '@/components/commons/page-inset';
import { GettingStartedChecklist } from '@/components/onboarding/getting-started-checklist';

export default function LeadsPage() {
  return (
    <PageInset title="Leads">
      <div className="px-4">
        <GettingStartedChecklist />
        <LeadsContainer />
      </div>
    </PageInset>
  );
}
