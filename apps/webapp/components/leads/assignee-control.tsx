'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlusIcon, UserMinusIcon } from 'lucide-react';

import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar';
import { useSessionContext } from '@/contexts/session';
import { canAssignLeads } from '@/lib/auth/permissions';
import { AssigneePicker, getInitials, type AssigneeUser } from '@/components/commons/assignee-picker';
import { assignClient, takeClient, releaseClient } from '@/actions/clients';

interface LeadAssigneeControlProps {
  /** Lead whose active atendimento (chat) carries the responsible. */
  leadId: string;
  /** Current responsible, or null when the atendimento is unassigned. */
  assignee?: AssigneeUser | null;
  /** Read-only mode (e.g. inactive client or closed chat). */
  disabled?: boolean;
  /** Called after a successful change so the caller can refresh its data. */
  onUpdated?: () => void;
}

const handleResult = (result: any, successMessage: string, onUpdated?: () => void): boolean => {
  if (result?.status !== 200) {
    toast.error(result?.message ?? 'Ops! Ocorreu um erro ao processar sua requisição.');
    return false;
  }
  toast.success(successMessage);
  onUpdated?.();
  return true;
};

/**
 * Role-aware responsible control for an atendimento (the lead's active chat).
 * Admin/owner get a full picker; restricted roles (SDR) can take a free
 * atendimento or release their own. Shared by the kanban card and the chat header.
 */
export const LeadAssigneeControl = ({ leadId, assignee = null, disabled, onUpdated }: LeadAssigneeControlProps) => {
  const { user } = useSessionContext();
  const [loading, setLoading] = useState(false);

  const canAssign = canAssignLeads(user?.role);
  const isMine = assignee && user?.id && assignee.id === user.id;

  const assigneeBadge = assignee ? (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        {assignee.image && <AvatarImage src={assignee.image} />}
        <AvatarFallback className="text-[10px]">{getInitials(assignee.name)}</AvatarFallback>
      </Avatar>
      <span className="max-w-[140px] truncate text-sm">{assignee.name}</span>
    </div>
  ) : (
    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
      Sem responsável
    </Badge>
  );

  // Admin / owner: full picker to assign, reassign or clear anyone.
  if (canAssign) {
    return (
      <AssigneePicker
        value={assignee}
        align="start"
        disabled={disabled || loading}
        onSelect={async userId => {
          setLoading(true);
          try {
            const result = await assignClient(leadId, userId);
            handleResult(result, userId ? 'Responsável atribuído.' : 'Responsável removido.', onUpdated);
          } finally {
            setLoading(false);
          }
        }}
        trigger={
          <Button type="button" variant="ghost" size="sm" disabled={disabled || loading} className="h-8 justify-start gap-2 px-2">
            {assigneeBadge}
          </Button>
        }
      />
    );
  }

  // Restricted roles (SDR) in read-only contexts: just the badge.
  if (disabled) {
    return assigneeBadge;
  }

  // Restricted roles (SDR): one-click take when free, release when it's theirs.
  if (!assignee) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        className="h-8 gap-2"
        onClick={async () => {
          setLoading(true);
          try {
            const result = await takeClient(leadId);
            handleResult(result, 'Atendimento assumido com sucesso.', onUpdated);
          } finally {
            setLoading(false);
          }
        }}>
        <UserPlusIcon className="h-3.5 w-3.5" />
        Assumir
      </Button>
    );
  }

  if (isMine) {
    return (
      <div className="flex items-center gap-2">
        {assigneeBadge}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={async () => {
            setLoading(true);
            try {
              const result = await releaseClient(leadId);
              handleResult(result, 'Atendimento liberado para a fila.', onUpdated);
            } finally {
              setLoading(false);
            }
          }}>
          <UserMinusIcon className="h-3.5 w-3.5" />
          Liberar
        </Button>
      </div>
    );
  }

  return assigneeBadge;
};
