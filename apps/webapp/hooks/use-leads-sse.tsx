'use client';

import { useEffect } from 'react';

export const useLeadsSSE = (): void => {
  useEffect(() => {
    const since = new Date().toISOString();
    const url = `/api/leads/stream?since=${encodeURIComponent(since)}`;
    const eventSource = new EventSource(url);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'leads_updated') {
          document.dispatchEvent(new CustomEvent('leads:updated'));
        }
      } catch {
        // ignore malformed events
      }
    };

    eventSource.addEventListener('message', handleMessage);

    return () => {
      eventSource.removeEventListener('message', handleMessage);
      eventSource.close();
    };
  }, []);
};
