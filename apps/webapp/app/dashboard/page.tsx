import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { capitalize } from '@workspace/utils/text';
import { getMe } from '@/actions/users';
import { PageInset } from '@/components/commons/page-inset';
import { StatCard } from '@/components/dashboard/stat-card';
import { PipelinePreview } from '@/components/dashboard/pipeline-preview';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { DASHBOARD_STATS } from '@/components/dashboard/mock-data';

const getGreeting = (hour: number): string => {
  if (hour < 12) {
    return 'Bom dia';
  }

  if (hour < 18) {
    return 'Boa tarde';
  }

  return 'Boa noite';
};

const formatGreetingDate = (date: Date): string => {
  const weekday = capitalize(new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''));
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date);
  const month = capitalize(new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', ''));
  const year = new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(date);

  return `${weekday}, ${day} ${month} ${year}`;
};

export default async function DashboardPage() {
  const user = await getMe();
  const first_name = user && user.name ? user.name.split(' ')[0] : 'Usuário';

  const now = new Date();
  const greeting = getGreeting(now.getHours());

  return (
    <PageInset title="Dashboard">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {greeting}, {first_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Filial Fortaleza · {formatGreetingDate(now)}</p>
          </div>

          <Button asChild className="gap-2 self-start sm:self-auto">
            <Link href="/pipelines">
              <Plus className="h-4 w-4" />
              Nova venda
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DASHBOARD_STATS.map(stat => (
            <StatCard key={stat.key} stat={stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PipelinePreview />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </PageInset>
  );
}
