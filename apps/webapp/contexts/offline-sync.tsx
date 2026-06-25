'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { toast } from 'sonner';

import { createClient, createNegotiationForClient } from '@/actions/clients';
import type { PartnerData } from '@/repositories/types';

const CLIENTS_STORAGE_KEY = 'lf_offline_queue_clients';
const NEGOTIATIONS_STORAGE_KEY = 'lf_offline_queue_negotiations';
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

export type NegotiationPayload = {
  client_id: string;
  client_name: string;
};

export type OfflineNegotiationItem = {
  id: string;
  payload: NegotiationPayload;
  queued_at: string;
  attempts: number;
};

type OfflineSyncContextValue = {
  is_online: boolean;
  is_syncing: boolean;
  pending_count: number;
  pending_clients: OfflineClientItem[];
  pending_negotiations: OfflineNegotiationItem[];
  addClientToQueue: (id: string, payload: ClientPayload) => void;
  addNegotiationToQueue: (id: string, payload: NegotiationPayload) => void;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue>({
  is_online: true,
  is_syncing: false,
  pending_count: 0,
  pending_clients: [],
  pending_negotiations: [],
  addClientToQueue: () => {},
  addNegotiationToQueue: () => {},
});

const readQueue = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);

    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = <T,>(key: string, items: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // localStorage indisponível
  }
};

const readClientQueue = (): OfflineClientItem[] => readQueue<OfflineClientItem>(CLIENTS_STORAGE_KEY);
const writeClientQueue = (items: OfflineClientItem[]): void => writeQueue(CLIENTS_STORAGE_KEY, items);
const readNegotiationQueue = (): OfflineNegotiationItem[] => readQueue<OfflineNegotiationItem>(NEGOTIATIONS_STORAGE_KEY);
const writeNegotiationQueue = (items: OfflineNegotiationItem[]): void => writeQueue(NEGOTIATIONS_STORAGE_KEY, items);

export const OfflineSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [is_online, set_is_online] = useState(true);
  const [is_syncing, set_is_syncing] = useState(false);
  const [pending_clients, set_pending_clients] = useState<OfflineClientItem[]>([]);
  const [pending_negotiations, set_pending_negotiations] = useState<OfflineNegotiationItem[]>([]);
  const is_syncing_ref = useRef(false);

  const refreshItems = useCallback(() => {
    set_pending_clients(readClientQueue());
    set_pending_negotiations(readNegotiationQueue());
  }, []);

  const syncClientQueue = useCallback(async (): Promise<number> => {
    const queue = readClientQueue();
    let synced_count = 0;

    for (const item of queue) {
      try {
        const result = await createClient({ ...item.payload, id: item.id });

        if (result?.status === 200) {
          const current = readClientQueue();
          writeClientQueue(current.filter(q => q.id !== item.id));
          synced_count++;
        } else {
          const next_attempts = item.attempts + 1;
          const current = readClientQueue();

          if (next_attempts >= MAX_ATTEMPTS) {
            writeClientQueue(current.filter(q => q.id !== item.id));
            toast.error(`Falha ao sincronizar "${item.payload.name}". Tente criar o cliente novamente.`);
          } else {
            writeClientQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
          }
        }
      } catch {
        const next_attempts = item.attempts + 1;
        const current = readClientQueue();

        if (next_attempts >= MAX_ATTEMPTS) {
          writeClientQueue(current.filter(q => q.id !== item.id));
          toast.error(`Falha ao sincronizar "${item.payload.name}". Tente criar o cliente novamente.`);
        } else {
          writeClientQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
        }
      }
    }

    return synced_count;
  }, []);

  const syncNegotiationQueue = useCallback(async (): Promise<number> => {
    const queue = readNegotiationQueue();
    let synced_count = 0;

    for (const item of queue) {
      try {
        const result = await createNegotiationForClient({ client_id: item.payload.client_id });

        if (result?.success) {
          const current = readNegotiationQueue();
          writeNegotiationQueue(current.filter(q => q.id !== item.id));
          synced_count++;
        } else {
          const next_attempts = item.attempts + 1;
          const current = readNegotiationQueue();

          if (next_attempts >= MAX_ATTEMPTS) {
            writeNegotiationQueue(current.filter(q => q.id !== item.id));
            toast.error(`Falha ao sincronizar negociação de "${item.payload.client_name}".`);
          } else {
            writeNegotiationQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
          }
        }
      } catch {
        const next_attempts = item.attempts + 1;
        const current = readNegotiationQueue();

        if (next_attempts >= MAX_ATTEMPTS) {
          writeNegotiationQueue(current.filter(q => q.id !== item.id));
          toast.error(`Falha ao sincronizar negociação de "${item.payload.client_name}".`);
        } else {
          writeNegotiationQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
        }
      }
    }

    return synced_count;
  }, []);

  const syncQueue = useCallback(async (): Promise<void> => {
    if (is_syncing_ref.current) {
      return;
    }

    const clients = readClientQueue();
    const negotiations = readNegotiationQueue();

    if (clients.length === 0 && negotiations.length === 0) {
      return;
    }

    is_syncing_ref.current = true;
    set_is_syncing(true);

    const synced_clients = await syncClientQueue();
    const synced_negotiations = await syncNegotiationQueue();

    is_syncing_ref.current = false;
    set_is_syncing(false);
    refreshItems();

    if (synced_clients > 0) {
      const label = synced_clients === 1 ? '1 cliente sincronizado' : `${synced_clients} clientes sincronizados`;
      toast.success(`${label} com sucesso.`);
      document.dispatchEvent(new Event('clients:updated'));
    }

    if (synced_negotiations > 0) {
      const label = synced_negotiations === 1 ? '1 negociação sincronizada' : `${synced_negotiations} negociações sincronizadas`;
      toast.success(`${label} com sucesso.`);
      document.dispatchEvent(new Event('leads:updated'));
    }
  }, [refreshItems, syncClientQueue, syncNegotiationQueue]);

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
    const queue = readClientQueue();
    const item: OfflineClientItem = {
      id,
      payload,
      queued_at: new Date().toISOString(),
      attempts: 0,
    };

    const next = [...queue, item];

    writeClientQueue(next);
    set_pending_clients(next);
  }, []);

  const addNegotiationToQueue = useCallback((id: string, payload: NegotiationPayload): void => {
    const queue = readNegotiationQueue();
    const item: OfflineNegotiationItem = {
      id,
      payload,
      queued_at: new Date().toISOString(),
      attempts: 0,
    };

    const next = [...queue, item];

    writeNegotiationQueue(next);
    set_pending_negotiations(next);
  }, []);

  const pending_count = pending_clients.length + pending_negotiations.length;

  return (
    <OfflineSyncContext.Provider value={{ is_online, is_syncing, pending_count, pending_clients, pending_negotiations, addClientToQueue, addNegotiationToQueue }}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSyncContext = (): OfflineSyncContextValue => useContext(OfflineSyncContext);
