'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Search, UserPlus, WifiOff } from 'lucide-react';

import { cpfOrCnpj } from '@workspace/utils/text';
import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { Input } from '@workspace/ui/components/input';
import { cn } from '@workspace/ui/lib/utils';

import { getClients } from '@/actions/clients';
import { createNegotiationForClient } from '@/actions/clients';
import { useOfflineSyncContext } from '@/contexts/offline-sync';
import { ClientDialogForm, type ClientDialogResult } from '@/components/clients/dialog-form';

type Client = {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
};

interface NewNegotiationDialogProps {
  trigger: React.ReactNode;
  onCreated?: () => void;
}

export const NewNegotiationDialog = ({ trigger, onCreated }: NewNegotiationDialogProps) => {
  const { is_online, addNegotiationToQueue } = useOfflineSyncContext();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setClients([]);
      setHasSearched(false);
      setIsCreating(false);
    }
  }, [open]);

  useEffect(() => {
    if (!is_online || !open) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setClients([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const result = await getClients({ q: query.trim(), page: 1, page_size: 10 });
        setClients((result.data ?? []) as Client[]);
        setHasSearched(true);
      } catch {
        toast.error('Erro ao buscar clientes.');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, is_online, open]);

  const handleSelectClient = async (client: Client) => {
    setIsCreating(true);

    try {
      const result = await createNegotiationForClient({ client_id: client.id });

      if (!result.success) {
        toast.error(result.message ?? 'Erro ao criar negociação.');
        return;
      }

      toast.success(`Negociação criada para ${client.name}.`);
      document.dispatchEvent(new Event('leads:updated'));
      setOpen(false);
      onCreated?.();
    } catch {
      toast.error('Erro ao criar negociação.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClientCreated = async (result?: ClientDialogResult) => {
    setClientDialogOpen(false);

    if (!result) {
      return;
    }

    if (is_online) {
      setIsCreating(true);

      try {
        const res = await createNegotiationForClient({ client_id: result.id });

        if (!res.success) {
          toast.error(res.message ?? 'Erro ao criar negociação.');
          return;
        }

        toast.success(`Negociação criada para ${result.name}.`);
        document.dispatchEvent(new Event('leads:updated'));
        setOpen(false);
        onCreated?.();
      } catch {
        toast.error('Erro ao criar negociação.');
      } finally {
        setIsCreating(false);
      }

      return;
    }

    addNegotiationToQueue(crypto.randomUUID(), {
      client_id: result.id,
      client_name: result.name,
    });

    toast.success('Negociação salva localmente. Será sincronizada ao reconectar.');
    setOpen(false);
  };

  const showEmptyState = hasSearched && clients.length === 0 && !isSearching;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>

        <DialogContent className="sm:max-w-[480px] gap-0">
          <DialogHeader>
            <DialogTitle>Nova Negociação</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {is_online ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar cliente por nome, CPF/CNPJ ou telefone..."
                    className="pl-10"
                    autoFocus
                    disabled={isCreating}
                  />
                </div>

                <div className="min-h-[120px]">
                  {!query.trim() && !hasSearched && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Digite para buscar um cliente existente.
                    </p>
                  )}

                  {isSearching && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {!isSearching && clients.length > 0 && (
                    <div className="max-h-[280px] space-y-1 overflow-y-auto rounded-md border p-1">
                      {clients.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          disabled={isCreating}
                          onClick={() => handleSelectClient(client)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                            'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
                            'disabled:cursor-not-allowed disabled:opacity-50'
                          )}>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">{client.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[
                                client.document ? cpfOrCnpj(client.document) : null,
                                client.phone,
                              ]
                                .filter(Boolean)
                                .join(' · ') || client.email || ''}
                            </p>
                          </div>

                          {isCreating && (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {showEmptyState && (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setClientDialogOpen(true)}>
                        <UserPlus className="h-4 w-4" />
                        Criar cliente
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <WifiOff className="h-5 w-5" />
                  <span className="text-sm font-medium">Sem conexão</span>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  A busca de clientes não está disponível offline. Crie um novo cliente para associar à negociação.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setClientDialogOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Criar cliente
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <ClientDialogForm onSubmit={handleClientCreated} />
        </DialogContent>
      </Dialog>
    </>
  );
};
