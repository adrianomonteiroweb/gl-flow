'use client';

import { useCallback, useEffect, useState } from 'react';

export type ViewType = 'list' | 'kanban';

const VIEW_KEY = 'leads-view-preference';
const PIPELINE_KEY = 'leads-pipeline-preference';
const TEAM_FILTER_KEY = 'leads-team-filter-preference';
const FILTERS_VISIBLE_KEY = 'leads-filters-visible-preference';

const readStored = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key: string, value: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (value === null) {
      localStorage.removeItem(key);

      return;
    }

    localStorage.setItem(key, value);
  } catch {
    // Ignora cenários sem acesso a localStorage (modo privado / cota cheia).
  }
};

interface LeadsPreferences {
  mounted: boolean;
  view: ViewType;
  setView: (view: ViewType) => void;
  pipelineId: string | null;
  setPipelineId: (id: string | null) => void;
  teamFilter: boolean | null;
  setTeamFilter: (value: boolean) => void;
  filtersVisible: boolean | null;
  setFiltersVisible: (value: boolean) => void;
}

export const useLeadsPreferences = (): LeadsPreferences => {
  const [mounted, setMounted] = useState(false);
  const [view, setViewState] = useState<ViewType>('list');
  const [pipelineId, setPipelineIdState] = useState<string | null>(null);
  const [teamFilter, setTeamFilterState] = useState<boolean | null>(null);
  const [filtersVisible, setFiltersVisibleState] = useState<boolean | null>(null);

  useEffect(() => {
    const savedView = readStored(VIEW_KEY);

    if (savedView === 'list' || savedView === 'kanban') {
      setViewState(savedView);
    }

    const savedPipeline = readStored(PIPELINE_KEY);

    if (savedPipeline) {
      setPipelineIdState(savedPipeline);
    }

    const savedTeam = readStored(TEAM_FILTER_KEY);

    if (savedTeam !== null) {
      setTeamFilterState(savedTeam === 'true');
    }

    const savedFiltersVisible = readStored(FILTERS_VISIBLE_KEY);

    if (savedFiltersVisible !== null) {
      setFiltersVisibleState(savedFiltersVisible === 'true');
    }

    setMounted(true);
  }, []);

  const setView = useCallback((next: ViewType) => {
    setViewState(next);
    writeStored(VIEW_KEY, next);
  }, []);

  const setPipelineId = useCallback((next: string | null) => {
    setPipelineIdState(next);
    writeStored(PIPELINE_KEY, next);
  }, []);

  const setTeamFilter = useCallback((next: boolean) => {
    setTeamFilterState(next);
    writeStored(TEAM_FILTER_KEY, String(next));
  }, []);

  const setFiltersVisible = useCallback((next: boolean) => {
    setFiltersVisibleState(next);
    writeStored(FILTERS_VISIBLE_KEY, String(next));
  }, []);

  return { mounted, view, setView, pipelineId, setPipelineId, teamFilter, setTeamFilter, filtersVisible, setFiltersVisible };
};
