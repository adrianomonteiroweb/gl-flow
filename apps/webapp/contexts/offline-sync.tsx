'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { toast } from 'sonner';

import { createClient } from '@/actions/clients';
import type { PartnerData } from '@/repositories/types';

const STORAGE_KEY = 'lf_offline_queue_clients';
const MAX_ATTEMPTS = 3;

export type ClientPayload = {
  person_type: 'pf' | 'pj';
  name: string;
  trade_name?: string;
  document?: string;
  email?: string;
  phone?: string;
  phone_secondary?: string;
  birth_date?: string;
  founding_date?: string;
  marital_status?: string;
  address?: {
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  partners?: PartnerData[];
  payload?: Record<string, unknown>;
  client_created_at?: string;
};

export type OfflineClientItem = {
  id: string;
  payload: ClientPayload;
  queued_at: string;
  attempts: number;
};

type OfflineSyncContextValue = {
  is_online: boolean;
  is_syncing: boolean;
  pending_count: number;
  pending_clients: OfflineClientItem[];
  addClientToQueue: (id: string, payload: ClientPayload) => void;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue>({
  is_online: true,
  is_syncing: false,
  pending_count: 0,
  pending_clients: [],
  addClientToQueue: () => {},
});

const readQueue = (): OfflineClientItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    return raw ? (JSON.parse(raw) as OfflineClientItem[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (items: OfflineClientItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage indisponível
  }
};

export const OfflineSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [is_online, set_is_online] = useState(true);
  const [is_syncing, set_is_syncing] = useState(false);
  const [pending_clients, set_pending_clients] = useState<OfflineClientItem[]>([]);
  const is_syncing_ref = useRef(false);

  const refreshItems = useCallback(() => {
    set_pending_clients(readQueue());
  }, []);

  const syncQueue = useCallback(async (): Promise<void> => {
    if (is_syncing_ref.current) {
      return;
    }

    const queue = readQueue();

    if (queue.length === 0) {
      return;
    }

    is_syncing_ref.current = true;
    set_is_syncing(true);

    let synced_count = 0;

    for (const item of queue) {
      try {
        const result = await createClient({ ...item.payload, id: item.id });

        if (result?.status === 200) {
          const current = readQueue();
          writeQueue(current.filter(q => q.id !== item.id));
          synced_count++;
        } else {
          const next_attempts = item.attempts + 1;
          const current = readQueue();

          if (next_attempts >= MAX_ATTEMPTS) {
            writeQueue(current.filter(q => q.id !== item.id));
            toast.error(`Falha ao sincronizar "${item.payload.name}". Tente criar o cliente novamente.`);
          } else {
            writeQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
          }
        }
      } catch {
        const next_attempts = item.attempts + 1;
        const current = readQueue();

        if (next_attempts >= MAX_ATTEMPTS) {
          writeQueue(current.filter(q => q.id !== item.id));
          toast.error(`Falha ao sincronizar "${item.payload.name}". Tente criar o cliente novamente.`);
        } else {
          writeQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
        }
      }
    }

    is_syncing_ref.current = false;
    set_is_syncing(false);
    refreshItems();

    if (synced_count > 0) {
      const label = synced_count === 1 ? '1 cliente sincronizado' : `${synced_count} clientes sincronizados`;
      toast.success(`${label} com sucesso.`);
      document.dispatchEvent(new Event('clients:updated'));
    }
  }, [refreshItems]);

  useEffect(() => {
    set_is_online(navigator.onLine);
    refreshItems();

    const handle_online = (): void => {
      set_is_online(true);
      syncQueue();
    };

    const handle_offline = (): void => {
      set_is_online(false);
    };

    window.addEventListener('online', handle_online);
    window.addEventListener('offline', handle_offline);

    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online', handle_online);
      window.removeEventListener('offline', handle_offline);
    };
  }, [syncQueue, refreshItems]);

  const addClientToQueue = useCallback((id: string, payload: ClientPayload): void => {
    const queue = readQueue();
    const item: OfflineClientItem = {
      id,
      payload,
      queued_at: new Date().toISOString(),
      attempts: 0,
    };

    const next = [...queue, item];

    writeQueue(next);
    set_pending_clients(next);
  }, []);

  return (
    <OfflineSyncContext.Provider value={{ is_online, is_syncing, pending_count: pending_clients.length, pending_clients, addClientToQueue }}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSyncContext = (): OfflineSyncContextValue => useContext(OfflineSyncContext);
