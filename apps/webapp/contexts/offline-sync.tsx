'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { toast } from 'sonner';

import { createClient, createNegotiationForClient, createQuickLead } from '@/actions/clients';
import { updateLeadStep, updateLeadLossReason } from '@/actions/leads';
import type { PartnerData } from '@/repositories/types';

const CLIENTS_STORAGE_KEY = 'lf_offline_queue_clients';
const NEGOTIATIONS_STORAGE_KEY = 'lf_offline_queue_negotiations';
const LEAD_STEPS_STORAGE_KEY = 'lf_offline_queue_lead_steps';
const QUICK_LEADS_STORAGE_KEY = 'lf_offline_queue_quick_leads';
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

export type LeadStepPayload = {
  lead_id: string;
  step_id: string;
  status_id?: string;
  loss_reason?: string;
  lead_name?: string;
};

export type OfflineLeadStepItem = {
  id: string;
  payload: LeadStepPayload;
  queued_at: string;
  attempts: number;
};

export type QuickLeadPayload = {
  name: string;
  email?: string;
  phone: string;
};

export type OfflineQuickLeadItem = {
  id: string;
  payload: QuickLeadPayload;
  queued_at: string;
  attempts: number;
};

type OfflineSyncContextValue = {
  is_online: boolean;
  is_syncing: boolean;
  pending_count: number;
  pending_clients: OfflineClientItem[];
  pending_negotiations: OfflineNegotiationItem[];
  pending_lead_steps: OfflineLeadStepItem[];
  pending_quick_leads: OfflineQuickLeadItem[];
  addClientToQueue: (id: string, payload: ClientPayload) => void;
  addNegotiationToQueue: (id: string, payload: NegotiationPayload) => void;
  addLeadStepToQueue: (id: string, payload: LeadStepPayload) => void;
  addQuickLeadToQueue: (id: string, payload: QuickLeadPayload) => void;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue>({
  is_online: true,
  is_syncing: false,
  pending_count: 0,
  pending_clients: [],
  pending_negotiations: [],
  pending_lead_steps: [],
  pending_quick_leads: [],
  addClientToQueue: () => {},
  addNegotiationToQueue: () => {},
  addLeadStepToQueue: () => {},
  addQuickLeadToQueue: () => {},
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
const readLeadStepQueue = (): OfflineLeadStepItem[] => readQueue<OfflineLeadStepItem>(LEAD_STEPS_STORAGE_KEY);
const writeLeadStepQueue = (items: OfflineLeadStepItem[]): void => writeQueue(LEAD_STEPS_STORAGE_KEY, items);
const readQuickLeadQueue = (): OfflineQuickLeadItem[] => readQueue<OfflineQuickLeadItem>(QUICK_LEADS_STORAGE_KEY);
const writeQuickLeadQueue = (items: OfflineQuickLeadItem[]): void => writeQueue(QUICK_LEADS_STORAGE_KEY, items);

export const OfflineSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [is_online, set_is_online] = useState(true);
  const [is_syncing, set_is_syncing] = useState(false);
  const [pending_clients, set_pending_clients] = useState<OfflineClientItem[]>([]);
  const [pending_negotiations, set_pending_negotiations] = useState<OfflineNegotiationItem[]>([]);
  const [pending_lead_steps, set_pending_lead_steps] = useState<OfflineLeadStepItem[]>([]);
  const [pending_quick_leads, set_pending_quick_leads] = useState<OfflineQuickLeadItem[]>([]);
  const is_syncing_ref = useRef(false);

  const refreshItems = useCallback(() => {
    set_pending_clients(readClientQueue());
    set_pending_negotiations(readNegotiationQueue());
    set_pending_lead_steps(readLeadStepQueue());
    set_pending_quick_leads(readQuickLeadQueue());
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

  const syncLeadStepQueue = useCallback(async (): Promise<number> => {
    const queue = readLeadStepQueue();
    let synced_count = 0;

    for (const item of queue) {
      try {
        const result = await updateLeadStep(item.payload.lead_id, item.payload.step_id, item.payload.status_id);

        if (result?.success) {
          if (item.payload.loss_reason) {
            try {
              await updateLeadLossReason(item.payload.lead_id, item.payload.loss_reason);
            } catch {
              // motivo de perda é best-effort: a etapa já foi aplicada
            }
          }

          const current = readLeadStepQueue();
          writeLeadStepQueue(current.filter(q => q.id !== item.id));
          synced_count++;
        } else {
          const next_attempts = item.attempts + 1;
          const current = readLeadStepQueue();

          if (next_attempts >= MAX_ATTEMPTS) {
            writeLeadStepQueue(current.filter(q => q.id !== item.id));
            toast.error(`Falha ao sincronizar mudança de etapa${item.payload.lead_name ? ` de "${item.payload.lead_name}"` : ''}.`);
          } else {
            writeLeadStepQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
          }
        }
      } catch {
        const next_attempts = item.attempts + 1;
        const current = readLeadStepQueue();

        if (next_attempts >= MAX_ATTEMPTS) {
          writeLeadStepQueue(current.filter(q => q.id !== item.id));
          toast.error(`Falha ao sincronizar mudança de etapa${item.payload.lead_name ? ` de "${item.payload.lead_name}"` : ''}.`);
        } else {
          writeLeadStepQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
        }
      }
    }

    return synced_count;
  }, []);

  const syncQuickLeadQueue = useCallback(async (): Promise<number> => {
    const queue = readQuickLeadQueue();
    let synced_count = 0;

    for (const item of queue) {
      try {
        const result = await createQuickLead({ ...item.payload, id: item.id });

        if (result?.success) {
          const current = readQuickLeadQueue();
          writeQuickLeadQueue(current.filter(q => q.id !== item.id));
          synced_count++;
        } else {
          const next_attempts = item.attempts + 1;
          const current = readQuickLeadQueue();

          if (next_attempts >= MAX_ATTEMPTS) {
            writeQuickLeadQueue(current.filter(q => q.id !== item.id));
            toast.error(`Falha ao sincronizar lead "${item.payload.name}". Tente cadastrar novamente.`);
          } else {
            writeQuickLeadQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
          }
        }
      } catch {
        const next_attempts = item.attempts + 1;
        const current = readQuickLeadQueue();

        if (next_attempts >= MAX_ATTEMPTS) {
          writeQuickLeadQueue(current.filter(q => q.id !== item.id));
          toast.error(`Falha ao sincronizar lead "${item.payload.name}". Tente cadastrar novamente.`);
        } else {
          writeQuickLeadQueue(current.map(q => (q.id === item.id ? { ...q, attempts: next_attempts } : q)));
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
    const lead_steps = readLeadStepQueue();
    const quick_leads = readQuickLeadQueue();

    if (clients.length === 0 && negotiations.length === 0 && lead_steps.length === 0 && quick_leads.length === 0) {
      return;
    }

    is_syncing_ref.current = true;
    set_is_syncing(true);

    const synced_clients = await syncClientQueue();
    const synced_negotiations = await syncNegotiationQueue();
    const synced_lead_steps = await syncLeadStepQueue();
    const synced_quick_leads = await syncQuickLeadQueue();

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

    if (synced_lead_steps > 0) {
      const label = synced_lead_steps === 1 ? '1 mudança de etapa sincronizada' : `${synced_lead_steps} mudanças de etapa sincronizadas`;
      toast.success(`${label} com sucesso.`);
      document.dispatchEvent(new Event('leads:updated'));
    }

    if (synced_quick_leads > 0) {
      const label = synced_quick_leads === 1 ? '1 lead sincronizado' : `${synced_quick_leads} leads sincronizados`;
      toast.success(`${label} com sucesso.`);
      document.dispatchEvent(new Event('leads:updated'));
      document.dispatchEvent(new Event('clients:updated'));
    }
  }, [refreshItems, syncClientQueue, syncNegotiationQueue, syncLeadStepQueue, syncQuickLeadQueue]);

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

  const addLeadStepToQueue = useCallback((id: string, payload: LeadStepPayload): void => {
    const queue = readLeadStepQueue();
    const item: OfflineLeadStepItem = {
      id,
      payload,
      queued_at: new Date().toISOString(),
      attempts: 0,
    };

    const next = [...queue.filter(q => q.payload.lead_id !== payload.lead_id), item];

    writeLeadStepQueue(next);
    set_pending_lead_steps(next);
  }, []);

  const addQuickLeadToQueue = useCallback((id: string, payload: QuickLeadPayload): void => {
    const queue = readQuickLeadQueue();
    const item: OfflineQuickLeadItem = {
      id,
      payload,
      queued_at: new Date().toISOString(),
      attempts: 0,
    };

    const next = [...queue, item];

    writeQuickLeadQueue(next);
    set_pending_quick_leads(next);
  }, []);

  const pending_count = pending_clients.length + pending_negotiations.length + pending_lead_steps.length + pending_quick_leads.length;

  return (
    <OfflineSyncContext.Provider value={{ is_online, is_syncing, pending_count, pending_clients, pending_negotiations, pending_lead_steps, pending_quick_leads, addClientToQueue, addNegotiationToQueue, addLeadStepToQueue, addQuickLeadToQueue }}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSyncContext = (): OfflineSyncContextValue => useContext(OfflineSyncContext);
