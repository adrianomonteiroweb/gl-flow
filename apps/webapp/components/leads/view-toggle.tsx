'use client';

import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { List, Kanban } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

export type ViewType = 'list' | 'kanban';

interface ViewToggleProps {
  onViewChange?: (view: ViewType) => void;
}

const VIEW_STORAGE_KEY = 'leads-view-preference';
const getStoredView = (): ViewType => {
  if (typeof window === 'undefined') return 'list';
  const saved = localStorage.getItem(VIEW_STORAGE_KEY) as ViewType | null;
  return saved && ['list', 'kanban'].includes(saved) ? saved : 'list';
};

export const ViewToggle = ({ onViewChange }: ViewToggleProps) => {
  const [view, setView] = useState<ViewType>('list');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setView(getStoredView());
    setMounted(true);
  }, []);

  const handleViewChange = useCallback(
    (newView: ViewType) => {
      setView(newView);
      localStorage.setItem(VIEW_STORAGE_KEY, newView);
      onViewChange?.(newView);
    },
    [onViewChange]
  );

  // Evitar hydration mismatch
  if (!mounted) {
    return (
      <Tabs value="list" className="w-fit opacity-50 pointer-events-none">
        <TabsList className="grid w-full grid-cols-2 bg-muted border border-border">
          <TabsTrigger
            value="list"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-medium">Lista</span>
          </TabsTrigger>
          <TabsTrigger
            value="kanban"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
            <Kanban className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-medium">Kanban</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
  }

  return (
    <Tabs value={view} onValueChange={value => handleViewChange(value as ViewType)}>
      <TabsList className="grid w-full grid-cols-2 bg-muted border border-border">
        <TabsTrigger
          value="list"
          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
          <List className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Lista</span>
        </TabsTrigger>
        <TabsTrigger
          value="kanban"
          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all">
          <Kanban className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Kanban</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
