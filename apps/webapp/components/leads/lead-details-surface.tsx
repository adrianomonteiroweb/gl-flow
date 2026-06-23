'use client';

import { ScrollArea } from '@workspace/ui/components/scroll-area';
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
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{lead_name}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="overflow-y-auto">{content}</ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>{lead_name}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full">{content}</ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
