'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2Icon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import SubmitButton from '@workspace/ui/components/submit-button';

import { getUsers } from '@/actions/users';
import { getTeam, setTeamMembers } from '@/actions/teams';
import { getRoleLabel } from '@/lib/auth/permissions';

type UserRow = { id: string; name: string; email: string; role?: string | null };

type Props = {
  open: boolean;
  teamId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export const TeamMembersDialog = ({ open, teamId, onOpenChange, onSaved }: Props) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !teamId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [usersRes, teamRes] = await Promise.all([
        getUsers({ q: '', page: 1, page_size: 200 }),
        getTeam(teamId),
      ]);

      if (cancelled) {
        return;
      }

      const list = (usersRes.data || []) as UserRow[];
      setUsers(list);

      if (teamRes.success && teamRes.data) {
        const memberIds = (teamRes.data as any).members?.map((m: any) => m.user_id) ?? [];
        setSelected(new Set(memberIds));
      }

      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, teamId]);

  const toggle = (userId: string) => {
    setSelected(prev => {
      const next = new Set(prev);

      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }

      return next;
    });
  };

  const handleSave = async () => {
    if (!teamId) {
      return;
    }

    setSubmitting(true);
    const res = await setTeamMembers(teamId, Array.from(selected));

    if (res.success) {
      toast.success('Membros atualizados.');
      onSaved();
    } else {
      toast.error(res.error || 'Erro ao atualizar membros');
    }

    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Membros do time</DialogTitle>
          <DialogDescription>Selecione os membros que fazem parte deste time.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-6 text-sm text-center text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1 py-2">
            {users.map(user => {
              const label = getRoleLabel(user.role);

              return (
                <label
                  key={user.id}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(user.id)}
                    onCheckedChange={() => toggle(user.id)}
                    disabled={submitting}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {label}
                  </Badge>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <SubmitButton isSubmitting={submitting} onClick={handleSave} disabled={loading}>
            Salvar
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
