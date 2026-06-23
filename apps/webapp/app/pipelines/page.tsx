'use client';

import { LeadsContainer } from '@/components/leads/leads-container';
import { PageInset } from '@/components/commons/page-inset';

export default function LeadsPage() {
  return (
    <PageInset title="Pipeline">
      <div className="px-4">
        <LeadsContainer />
      </div>
    </PageInset>
  );
}
