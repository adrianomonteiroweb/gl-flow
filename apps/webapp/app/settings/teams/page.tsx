'use client';

import { PageInset } from '@/components/commons/page-inset';
import { TeamsList } from '@/components/teams/teams-list';
import { SettingsGuard } from '@/components/auth/settings-guard';

export default function TeamsPage() {
  return (
    <SettingsGuard>
      <PageInset title="Times">
        <div className="w-full px-4 py-8">
          <TeamsList />
        </div>
      </PageInset>
    </SettingsGuard>
  );
}
