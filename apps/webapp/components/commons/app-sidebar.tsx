'use client';

import Link from 'next/link';
import type * as React from 'react';
import { LayoutDashboardIcon, InboxIcon, UsersRoundIcon, SettingsIcon, UserPlusIcon, BikeIcon } from 'lucide-react';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from '@workspace/ui/components/sidebar';
import { Separator } from '@workspace/ui/components/separator';

import { useSessionContext } from '@/contexts/session';
import { canAccessSettings } from '@/lib/auth/permissions';

import { SidebarNav } from './nav-main';
import { NavUser } from './nav-user';
import { AppLogo } from './logo';
import { OfflineSyncBadge } from './offline-sync-badge';

const data = {
  navMain: [
    {
      title: 'Dashboard',
      icon: LayoutDashboardIcon,
      url: '/dashboard',
    },
    {
      title: 'Pipeline',
      icon: InboxIcon,
      url: '/pipelines',
    },
    {
      title: 'Cadastro Rápido de Lead',
      icon: UserPlusIcon,
      action: () => document.dispatchEvent(new Event('quick-lead:open')),
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
        { title: 'Usuários e Permissões', url: '/users' },
        { title: 'Pipelines e Etapas', url: '/settings/pipelines' },
        { title: 'Catálogo de Veículos', icon: BikeIcon, url: '/catalog' },
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
        <OfflineSyncBadge />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
