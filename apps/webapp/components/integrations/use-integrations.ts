'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  listIntegrations,
  getIntegrationState,
  setIntegrationEnabled,
  saveIntegrationCredentials,
  disconnectIntegration,
  triggerIntegrationSync,
  testIntegrationConnection,
  type IntegrationViewModel,
} from '@/actions/integrations';

/** Catalog-level hook: loads every integration's state for the grid. */
export const useIntegrationsList = () => {
  const [items, setItems] = useState<IntegrationViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await listIntegrations();
      if (result.success) {
        setItems(result.data);
      } else {
        setLoadError(result.error ?? 'Erro ao carregar integrações');
      }
    } catch (error: any) {
      setLoadError(error?.message || 'Erro ao carregar integrações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleEnabled = useCallback(async (id: string, enabled: boolean) => {
    const result = await setIntegrationEnabled(id, enabled);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setItems(prev => prev.map(item => (item.id === id ? result.data : item)));
    toast.success(enabled ? 'Integração habilitada.' : 'Integração desabilitada.');
  }, []);

  return { items, isLoading, loadError, refetch: fetchItems, toggleEnabled };
};

/** Detail-level hook: state + mutations for a single integration. */
export const useIntegration = (id: string) => {
  const [state, setState] = useState<IntegrationViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const result = await getIntegrationState(id);
      if (result.success) setState(result.data);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const toggleEnabled = useCallback(
    async (enabled: boolean) => {
      const result = await setIntegrationEnabled(id, enabled);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setState(result.data);
      toast.success(enabled ? 'Integração habilitada.' : 'Integração desabilitada.');
    },
    [id]
  );

  const saveCredentials = useCallback(
    async (values: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
      const result = await saveIntegrationCredentials(id, values);
      if (result.success) {
        setState(result.data);
        return { success: true };
      }
      return { success: false, error: result.error };
    },
    [id]
  );

  const disconnect = useCallback(async () => {
    const result = await disconnectIntegration(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setState(result.data);
    toast.success('Integração desconectada.');
  }, [id]);

  const testConnection = useCallback(
    async (): Promise<{ success: boolean; error?: string }> => {
      setIsTesting(true);

      try {
        const result = await testIntegrationConnection(id);

        if ('data' in result && result.data) {
          setState(result.data);
        }

        if (result.success) {
          return { success: true };
        }

        return { success: false, error: result.error };
      } finally {
        setIsTesting(false);
      }
    },
    [id]
  );

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await triggerIntegrationSync(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const { created, updated, removed, errors } = result.data;
      toast.success(`Sincronização concluída: ${created} criados, ${updated} atualizados, ${removed} removidos.`);
      if (errors.length > 0) toast.warning(`${errors.length} erro(s) durante a sincronização.`);
      await fetchState();
    } finally {
      setIsSyncing(false);
    }
  }, [id, fetchState]);

  return { state, isLoading, isSyncing, isTesting, refetch: fetchState, toggleEnabled, saveCredentials, disconnect, sync, testConnection };
};
