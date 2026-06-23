'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { cn } from '@workspace/ui/lib/utils';
import { getUsers } from '@/actions/users';

export type AssigneeUser = {
  id: string;
  name: string;
  image?: string | null;
};

export const getInitials = (name?: string | null): string =>
  (name ?? '')
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'N';

interface AssigneePickerProps {
  /** Currently selected assignee, or null when unassigned. */
  value?: AssigneeUser | null;
  /** Called with the chosen user id, or null to clear the responsible. */
  onSelect: (userId: string | null) => void | Promise<void>;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Optional custom trigger. Defaults to a compact responsible button. */
  trigger?: React.ReactNode;
}

/**
 * Searchable user popover for assigning a responsible. Extracted from the chat
 * header pattern so the clients table and the inbox share one implementation.
 */
export const AssigneePicker = ({ value, onSelect, disabled, align = 'end', trigger }: AssigneePickerProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<AssigneeUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const result = await getUsers({ q: searchQuery, page: 1, page_size: 50 });
        setUsers((result.data || []) as AssigneeUser[]);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open]);

  const handleSelect = async (userId: string | null) => {
    try {
      setIsUpdating(true);
      await onSelect(userId);
      setOpen(false);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8 gap-2"
            aria-label={`Responsável: ${value?.name ?? 'nenhum'}. Clique para alterar.`}>
            {value ? (
              <>
                <Avatar className="h-5 w-5">
                  {value.image && <AvatarImage src={value.image} />}
                  <AvatarFallback className="text-[10px]">{getInitials(value.name)}</AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate text-xs">{value.name}</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Atribuir</span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-3">
        <div className="space-y-3">
          <div>
            <div className="mb-2 text-sm font-semibold">Responsável</div>
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {isLoading ? (
            <div className="py-2 text-center text-xs text-muted-foreground">Carregando...</div>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                disabled={isUpdating}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                  'hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
                  !value && 'bg-muted'
                )}>
                <span className="text-muted-foreground">Remover responsável</span>
                {!value && <Check className="ml-auto h-4 w-4" />}
              </button>
              {users.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user.id)}
                  disabled={isUpdating}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                    'hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
                    value?.id === user.id && 'bg-muted'
                  )}>
                  <Avatar className="h-6 w-6">
                    {user.image && <AvatarImage src={user.image} />}
                    <AvatarFallback className="text-[10px]">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left">{user.name}</span>
                  {value?.id === user.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
