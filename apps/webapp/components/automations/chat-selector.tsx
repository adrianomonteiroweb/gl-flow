'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { X } from 'lucide-react';

type ChatOption = {
  id: string;
  leadName: string;
  leadPhone: string | null;
  convState: string | null;
};

type Props = {
  chats: ChatOption[];
  selectedChatId?: string;
};

const STATE_LABELS: Record<string, string> = {
  AWAITING_NAME: 'Aguardando nome',
  AWAITING_ADDRESS_ZIP: 'Aguardando CEP',
  AWAITING_ADDRESS_STREET: 'Aguardando rua',
  AWAITING_ADDRESS_NUMBER: 'Aguardando número',
  QUALIFIED: 'Qualificado',
  BOT_PAUSED: 'Bot pausado',
  INACTIVE: 'Inativo',
  CLOSED: 'Encerrado',
};

export function ChatSelector({ chats, selectedChatId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? chats.filter(
        c =>
          c.leadName.toLowerCase().includes(search.toLowerCase()) ||
          c.leadPhone?.includes(search)
      )
    : chats;

  const handleSelect = (chatId: string) => {
    startTransition(() => {
      router.push(`/automations?chat=${chatId}`);
    });
  };

  const handleClear = () => {
    startTransition(() => {
      router.push('/automations');
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-1 min-w-48 max-w-xs">
        <Input
          placeholder="Buscar lead..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9"
        />
      </div>

      <Select value={selectedChatId ?? ''} onValueChange={handleSelect} disabled={isPending}>
        <SelectTrigger className="w-72 h-9">
          <SelectValue placeholder="Selecionar chat..." />
        </SelectTrigger>
        <SelectContent>
          {filtered.slice(0, 50).map(c => (
            <SelectItem key={c.id} value={c.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium truncate max-w-40">{c.leadName}</span>
                {c.convState && (
                  <span className="text-xs text-muted-foreground">
                    — {STATE_LABELS[c.convState] ?? c.convState}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhum chat encontrado
            </div>
          )}
        </SelectContent>
      </Select>

      {selectedChatId && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1">
          <X className="size-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
