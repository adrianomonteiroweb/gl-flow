'use client';

import Link from 'next/link';
import type * as React from 'react';
import { InboxIcon, UsersRoundIcon, SettingsIcon } from 'lucide-react';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@workspace/ui/components/sidebar';
import { Separator } from '@workspace/ui/components/separator';

import { useSessionContext } from '@/contexts/session';
import { canAccessSettings } from '@/lib/auth/permissions';

import { SidebarNav } from './nav-main';
import { NavUser } from './nav-user';
import { AppLogo } from './logo';

const data = {
  navMain: [
    {
      title: 'Pipeline',
      icon: InboxIcon,
      url: '/leads',
    },
    {
      title: 'Clientes',
      icon: UsersRoundIcon,
      url: '/clients',
    },
    {
      title: 'Configurações',
      icon: SettingsIcon,
      items: [
        { title: 'Empresa', url: '/company' },
        { title: 'Usuários e Permissões', url: '/users' },
        { title: 'Times', url: '/settings/teams' },
        { title: 'Produtos', url: '/products' },
        { title: 'Modelos de Proposta', url: '/proposal-templates' },
        { title: 'Apps e Integrações', url: '/settings/integrations' },
        {
          title: 'Leads',
          items: [
            { title: 'Pipelines e Etapas', url: '/settings/pipelines' },
            { title: 'Motivos de Perda', url: '/settings/loss-reasons' },
          ],
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }) {
  const { user } = useSessionContext();

  // Hide the "Configurações" group from roles without settings access.
  const navItems = canAccessSettings(user?.role) ? data.navMain : data.navMain.filter(item => item.title !== 'Configurações');

  return (
    <Sidebar variant="inset" collapsible="icon" className="antialiased" {...props}>
      <SidebarHeader>
        <Link href="/">
          <AppLogo />
        </Link>
      </SidebarHeader>

      <Separator className="my-2" />

      <SidebarContent>
        <SidebarNav items={navItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
