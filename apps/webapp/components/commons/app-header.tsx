'use client';

import type * as React from 'react';
import { UserPlusIcon } from 'lucide-react';

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@workspace/ui/components/breadcrumb';
import { Button } from '@workspace/ui/components/button';
import { Separator } from '@workspace/ui/components/separator';
import { SidebarTrigger } from '@workspace/ui/components/sidebar';
import Link from 'next/link';

type BreadcrumbLinkItem = {
  name: string;
  href: string;
};

type PageProps = {
  title?: string;
  parents?: BreadcrumbLinkItem[];
  toggleAi?: () => void;
  isAIOpen?: boolean;
};

export function AppHeader({ title = '', parents = [] }: PageProps) {
  const BreadcrumpItem = ({ item }: any) => (
    <>
      <BreadcrumbItem className="hidden md:block">
        <BreadcrumbLink asChild>
          <Link href={item.href}>{item.name}</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator className="hidden md:block" />
    </>
  );

  return (
    <header className="flex w-full h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="w-full flex justify-between">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />

          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden gap-1.5 text-xs"
            aria-label="Cadastro Rápido de Lead"
            onClick={() => document.dispatchEvent(new Event('quick-lead:open'))}>
            <UserPlusIcon className="size-4" />
            <span>Novo Lead</span>
          </Button>

          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {parents.map((parent: BreadcrumbLinkItem) => (
                <BreadcrumpItem key={parent.href} item={parent} />
              ))}

              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbPage>{title || ''}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
    </header>
  );
}
