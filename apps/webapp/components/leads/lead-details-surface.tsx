'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@workspace/ui/components/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@workspace/ui/components/drawer';
import { useIsMobile } from '@workspace/ui/hooks/use-mobile';

import { LeadDetailsContent } from './lead-details-panel';
import type { LeadItem } from './lead-card-content';

interface LeadDetailsSurfaceProps {
  item: LeadItem | null;
  tab?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LeadDetailsSurface = ({ item, tab, open, onOpenChange }: LeadDetailsSurfaceProps) => {
  const is_mobile = useIsMobile();

  const lead = item?.lead ?? null;

  if (!lead) {
    return null;
  }

  const lead_name = lead.name || 'Detalhes do lead';
  const content = <LeadDetailsContent lead={lead} chatId={item?.chat?.id} variant="embedded" defaultTab={tab} />;

  if (is_mobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[88vh] max-h-[88vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{lead_name}</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>{lead_name}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1">{content}</div>
      </SheetContent>
    </Sheet>
  );
};
