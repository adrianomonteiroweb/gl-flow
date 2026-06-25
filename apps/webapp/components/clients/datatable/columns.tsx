'use client';

import { DateFormatter } from '@workspace/utils';
import { InactivateClientButton } from '../delete-button';
import { ReactivateClientButton } from '../reactivate-button';
import { DetailClientButton } from '../detail-button';
import { Badge } from '@workspace/ui/components/badge';
import { useSessionContext } from '@/contexts/session';
import { canAccessSettings } from '@/lib/auth/permissions';
import { getToneClasses } from '@/lib/tone-colors';

export const columns: any = [
  {
    accessorKey: 'name',
    header: 'Nome',
  },
  {
    accessorKey: 'email',
    header: 'E-mail',
    cell: ({ row }: any) => row.original.email || '—',
  },
  {
    accessorKey: 'phone',
    header: 'Telefone',
    cell: ({ row }: any) => row.original.phone || row.original.phone_secondary || '—',
  },
  {
    accessorKey: 'address',
    header: 'Cidade',
    meta: { hideOnCard: true },
    cell: ({ row }: any) => {
      const address = row.original.address as any;
      if (!address?.city) return '—';
      return address.state ? `${address.city}/${address.state}` : address.city;
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Criado em',
    meta: { hideOnCard: true },
    cell: ({ row }: any) => DateFormatter.dateTime(row.original.created_at),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }: any) => {
      const isInactive = !!row.original.deleted_at;

      return isInactive ? (
        <Badge variant="secondary" className={getToneClasses('neutral').soft}>
          Inativo
        </Badge>
      ) : (
        <Badge variant="secondary" className={getToneClasses('success').soft}>
          Ativo
        </Badge>
      );
    },
  },
  {
    accessorKey: 'actions',
    header: 'Ações',
    cell: function ActionsCell({ row }: any) {
      const client = row.original;
      const isInactive = !!client.deleted_at;
      const { user } = useSessionContext();
      const canReactivate = isInactive && canAccessSettings(user?.role);

      return (
        <div className="flex items-center gap-2">
          <DetailClientButton client={client} />
          {!isInactive && <InactivateClientButton client={client} />}
          {canReactivate && <ReactivateClientButton client={client} />}
        </div>
      );
    },
  },
];
