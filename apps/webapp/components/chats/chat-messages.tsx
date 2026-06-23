'use client';

import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { cn } from '@workspace/ui/lib/utils';
import { formatTime } from '@workspace/utils';
import { Check, CheckCheck, ChevronDown, MessageCirclePlus } from 'lucide-react';
import { formatMessageDate } from './utils';

interface ChatMessagesProps {
  messages: any[];
  currentUserId?: string;
}

export const ChatMessages = ({ messages, currentUserId }: ChatMessagesProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
      if (isAtBottomRef.current) {
        setUnreadCount(0);
      }
    };
    viewport.addEventListener('scroll', onScroll);
    return () => viewport.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, []);

  useEffect(() => {
    const newCount = messages.length - prevMessagesLengthRef.current;
    if (newCount > 0) {
      const newMessages = messages.slice(prevMessagesLengthRef.current);
      const hasSentByCurrentUser = newMessages.some(item => {
        const sender = item.message?.sender;
        return sender?.type === 'user';
      });

      if (hasSentByCurrentUser) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        setUnreadCount(0);
      } else if (isAtBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setUnreadCount(prev => prev + newCount);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUserId]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
  };

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-2">
          <MessageCirclePlus className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 relative">
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 h-full p-4 bg-muted/20">
        <div className="space-y-4">
          {messages.map((item: any, index: number) => {
            const message = item.message;
            const sender = message.sender;
            const isCurrentUser = sender?.type === 'user';

            const currentDate = new Date(message.created_at).toDateString();
            const previousDate = index > 0 ? new Date(messages[index - 1].message.created_at).toDateString() : null;
            const showDateSeparator = index === 0 || currentDate !== previousDate;

            return (
              <div key={`${message.id}-${index}`}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center gap-2 my-4">
                    <div className="flex-1 h-px bg-border"></div>
                    <span className="text-xs text-muted-foreground px-2">{formatMessageDate(message.created_at)}</span>
                    <div className="flex-1 h-px bg-border"></div>
                  </div>
                )}

                <div
                  className={cn('flex', {
                    'justify-end': isCurrentUser,
                    'justify-start': !isCurrentUser,
                  })}>
                  <div
                    className={cn('max-w-[70%] rounded-lg px-4 py-2 space-y-1', {
                      'bg-primary/60 text-primary-foreground': isCurrentUser,
                      'bg-white dark:bg-background border': !isCurrentUser,
                    })}>
                    {sender?.id !== currentUserId && sender?.name && <div className="text-xs font-semibold text-primary">{sender.name}</div>}

                    {message.type === 'image' ? (
                      <div className="space-y-1">
                        <img
                          src={message.content.startsWith('http') ? message.content : `/api/media/${message.content}`}
                          alt={message.metadata?.caption || 'Imagem'}
                          className="max-w-full rounded-md cursor-pointer"
                          onClick={() =>
                            window.open(message.content.startsWith('http') ? message.content : `/api/media/${message.content}`, '_blank')
                          }
                        />
                        {message.metadata?.caption && <p className="text-sm whitespace-pre-wrap break-words">{message.metadata.caption}</p>}
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                    )}

                    <div
                      className={cn('flex items-center gap-1 text-xs', {
                        'text-primary-foreground/70': isCurrentUser,
                        'text-muted-foreground': !isCurrentUser,
                      })}></div>
                    <div className="flex items-center justify-between gap-2">
                      {message.origin && <div className="text-xs opacity-70">via {message.origin}</div>}
                      <span
                        className={cn('text-xs ', {
                          'text-primary-foreground/70': isCurrentUser,
                          'text-muted-foreground': !isCurrentUser,
                        })}>
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {unreadCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-background border shadow-md hover:bg-muted transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
