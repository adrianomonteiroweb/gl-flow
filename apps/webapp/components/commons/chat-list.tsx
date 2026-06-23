'use client';

import Link from 'next/link';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@workspace/ui/lib/utils';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Button } from '@workspace/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { getChatsWithLeads } from '@/actions/chats';
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { formatTime } from '@workspace/utils';
import { getStatusLabel } from '@/utils/status-utils';

export function ChatList({ search }: { search: string }) {
  const [data, setData] = useState<null | any[]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const isFirstLoad = useRef(true);

  const pathname = usePathname();

  const fetchData = useCallback(async () => {
    try {
      if (isFirstLoad.current) setLoading(true);
      const result = await getChatsWithLeads({ q: search, page: 1, page_size: 50 });
      setData(result.data || []);
      setError(false);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError(true);
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, [search]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center mt-5">
        <span className="text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-150px)]">
      {data && !error && !data.length && (
        <div className="flex h-full items-center justify-center mt-5">
          <span className="text-muted-foreground">Nenhum chat encontrado.</span>
        </div>
      )}

      {error && (
        <div className="mt-5 text-center">
          <div className="text-destructive">Ocorreu um erro ao carregar os chats.</div>
          <Button className="mt-2" variant="outline" size="sm" onClick={() => fetchData()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {data &&
        data.map((item: any) => {
          const chat = item.chat;
          const lead = item.lead;
          const isActive = pathname.includes(`/chats/${chat.id}`);

          const leadName = lead?.name || 'Lead sem nome';
          const chatTitle = chat.title || leadName;
          const leadInitials = leadName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <Link
              href={`/chats/${chat.id}`}
              key={chat.id}
              className={cn('hover:bg-muted flex items-center gap-3 border-b p-3 text-sm leading-tight last:border-b-0', {
                'bg-muted': isActive,
              })}>
              <Avatar className="h-10 w-10">
                <AvatarFallback>{leadInitials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-semibold truncate">{chatTitle}</div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {chat.status && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="left">{chat.status_name || getStatusLabel(chat.status)}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground truncate">{lead.name}</div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(chat.created_at)}</div>
                </div>
              </div>
            </Link>
          );
        })}
    </ScrollArea>
  );
}
