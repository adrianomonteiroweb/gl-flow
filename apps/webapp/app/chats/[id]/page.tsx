'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { ChatHeader } from '@/components/chats/chat-header';
import { ChatMessages } from '@/components/chats/chat-messages';
import { ChatInput } from '@/components/chats/chat-input';
import { LeadDetailsPanel } from '@/components/leads/lead-details-panel';
import { getChatWithLeadById } from '@/actions/chats';
import { getMessagesByChatWithChat, sendMessage } from '@/actions/messages';
import { getMe } from '@/actions/users';
import { AppLoading } from '@/components/commons/loading';
import { AppHeader } from '@/components/commons/app-header';

export default function ChatPage() {
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const isFirstLoad = useRef(true);
  const messageIdsRef = useRef<Set<string>>(new Set());

  const params = useParams();
  const chatId = params.id as string;

  const fetchChatData = useCallback(async () => {
    try {
      if (isFirstLoad.current) {
        setIsLoading(true);
      }

      const [chatResult, messagesResult, userResult] = await Promise.all([
        getChatWithLeadById(chatId),
        getMessagesByChatWithChat(chatId, { page: 1, page_size: 100 }),
        getMe(),
      ]);

      setChat(chatResult);
      setMessages(messagesResult.data || []);
      setCurrentUser(userResult);
    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      if (isFirstLoad.current) {
        setIsLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, [chatId]);

  useEffect(() => {
    fetchChatData();
    sessionStorage.setItem(`leads-read-${chatId}`, new Date().toISOString());
  }, [fetchChatData, chatId]);

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m: any) => m.message.id));
  }, [messages]);

  // SSE: listen for new messages in real-time
  useEffect(() => {
    if (!chatId) {
      return;
    }

    const since = new Date().toISOString();
    const es = new EventSource(`/api/chats/${chatId}/stream?since=${encodeURIComponent(since)}`);

    es.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type !== 'messages') {
          return;
        }

        const incoming = payload.data.filter((m: any) => !messageIdsRef.current.has(m.message.id));

        if (incoming.length === 0) {
          return;
        }

        incoming.forEach((m: any) => messageIdsRef.current.add(m.message.id));
        setMessages(prev => [...prev, ...incoming]);

        sessionStorage.setItem(`leads-read-${chatId}`, new Date().toISOString());
        // Re-fetch chat to sync lead data (address, name, etc.) updated by the bot
        getChatWithLeadById(chatId).then(result => {
          if (result) {
            setChat(result);
          }
        });
      } catch {
        // ignore parse errors
      }
    };

    return () => es.close();
  }, [chatId]);

  const handleSendMessage = async (content: string, type: 'text' | 'image' = 'text') => {
    if (!currentUser || !chatId) {
      return;
    }

    setIsSending(true);

    try {
      //  optimistic message - visual feedback imediato para o usuário
      const optimisticMessage = {
        message: {
          id: `temp-${Date.now()}`,
          chat_id: chatId,
          sender: {
            id: currentUser.id,
            type: 'user',
            name: currentUser.name,
          },
          type,
          origin: 'web',
          content: content,
          sent_at: new Date().toISOString(),
          viewed_at: null,
          received_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      setMessages(prev => [...prev, optimisticMessage]);

      const result = await sendMessage(
        chatId,
        content,
        {
          id: currentUser.id,
          type: 'user',
          name: currentUser.name,
        },
        type
      );

      if (result.success) {
        setMessages(prev =>
          prev.map(msg =>
            msg.message.id === optimisticMessage.message.id
              ? {
                  message: result.data,
                }
              : msg
          )
        );

        // Refresh chat data to update assignee if it was auto-assigned
        const chatResult = await getChatWithLeadById(chatId);

        if (chatResult) {
          setChat(chatResult);
        }
      } else {
        setMessages(prev => prev.filter(msg => msg.message.id !== optimisticMessage.message.id));
        toast.error(result.error ?? 'Erro ao enviar mensagem. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem. Por favor, tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <AppHeader title="Chat" toggleAi={() => {}} isAIOpen={false} />
      <div className="flex flex-1 min-h-0 w-full">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {isLoading ? (
            <AppLoading />
          ) : chat ? (
            <>
              <ChatHeader chat={chat.chat} lead={chat.lead} assignee={chat.assignee} onUpdated={fetchChatData} />
              <ChatMessages messages={messages} currentUserId={currentUser?.id} />
              <ChatInput onSendMessage={handleSendMessage} disabled={isSending} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">Não foi possível encontrar o chat.</p>
              </div>
            </div>
          )}
        </div>

        {!isLoading && chat && <LeadDetailsPanel lead={chat.lead} chatId={chat.chat?.id} />}
      </div>
    </div>
  );
}
