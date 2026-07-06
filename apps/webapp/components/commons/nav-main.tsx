'use client';

import Link from 'next/link';

import { usePathname } from 'next/navigation';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@workspace/ui/components/collapsible';

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@workspace/ui/components/sidebar';

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@workspace/ui/components/dropdown-menu';

type NavItem = {
  title: string;
  icon?: LucideIcon;
  url?: string;
  items?: NavItem[];
  external?: boolean;
  action?: () => void;
};

type NavProps = {
  items: NavItem[];
};

const checkIfItemIsActive = (item: NavItem, pathname: string): boolean => {
  if (item.url === pathname) return true;
  if (!item.items) return false;
  return item.items.some(subItem => checkIfItemIsActive(subItem, pathname));
};

export function SidebarNav({ items }: NavProps) {
  const pathname = usePathname();
  const { open, setOpenMobile, isMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map(item => (
          <Collapsible key={item.title} asChild defaultOpen={!!item?.items?.find(i => i.url === pathname)} className="group/collapsible">
            <SidebarMenuItem>
              <DropdownMenu>
                {item?.items?.length && open && (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                )}

                {item?.items?.length && !open && (
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                )}

                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuLabel className="uppercase text-xs text-muted-foreground mb-2">{item.title}</DropdownMenuLabel>
                  {item.items?.map(subItem => (
                    <DropdownMenuItem asChild key={subItem.title}>
                      <Link href={subItem.url!} className="cursor-pointer" onClick={handleLinkClick}>
                        <span>{subItem.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {!item?.items?.length && item.url && (
                <Link href={item.url} onClick={handleLinkClick}>
                  <SidebarMenuButton tooltip={item.title} isActive={item.url === pathname} className="cursor-pointer">
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              )}

              {!item?.items?.length && !item.url && item.action && (
                <SidebarMenuButton
                  tooltip={item.title}
                  className="cursor-pointer"
                  onClick={() => {
                    item.action?.();
                    handleLinkClick();
                  }}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              )}

              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map(subItem => {
                    const hasSubItems = subItem.items && subItem.items.length > 0;

                    if (hasSubItems) {
                      return (
                        <Collapsible key={subItem.title} asChild defaultOpen={checkIfItemIsActive(subItem, pathname)} className="group/collapsible">
                          <SidebarMenuSubItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuSubButton>
                                <span>{subItem.title}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuSubButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {subItem.items?.map(nestedItem => (
                                  <SidebarMenuSubItem key={nestedItem.title}>
                                    <SidebarMenuSubButton asChild isActive={nestedItem.url === pathname}>
                                      <Link href={nestedItem.url!} className="cursor-pointer" onClick={handleLinkClick}>
                                        <span>{nestedItem.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuSubItem>
                        </Collapsible>
                      );
                    }

                    return (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={subItem.url === pathname}>
                          <Link href={subItem.url!} className="cursor-pointer" onClick={handleLinkClick}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
