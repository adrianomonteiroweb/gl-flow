import { User } from 'lucide-react';

import { getMe } from '@/actions/users';
import { PageInset } from '@/components/commons/page-inset';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card';

export default async function Page() {
  const user = await getMe();

  const firstName = user && user.name ? user.name.split(' ')[0] : 'Usuário';

  return (
    <PageInset title="">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 mb-40">
        <div className="flex flex-col gap-8">
          <Card className="overflow-hidden border-none shadow-md p-0">
            <div className="relative bg-gradient-to-r from-primary/80 to-primary p-4 md:p-6 text-primary-foreground rounded-2xl">
              <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10">
                <User size={80} className="md:w-[120px] md:h-[120px]" />
              </div>
              <CardHeader className="p-0 space-y-1">
                <CardTitle className="text-2xl md:text-3xl font-bold">Olá, {firstName}!</CardTitle>
                <CardDescription className="text-primary-foreground/80 font-medium text-sm md:text-base">Bem-vindo(a)!</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4 md:gap-8 p-0 mt-4 md:mt-6"></CardContent>
            </div>
          </Card>
        </div>
      </div>
    </PageInset>
  );
}
