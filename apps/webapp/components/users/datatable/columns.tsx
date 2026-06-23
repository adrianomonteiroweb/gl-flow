'use client';

import { DateFormatter } from '@workspace/utils';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/auth/permissions';

import { EditUserButton } from '../edit-button';
import { DeleteUserButton } from '../delete-button';

export const columns: any = [
  {
    accessorKey: 'name',
    header: 'Nome',
  },
  {
    accessorKey: 'email',
    header: 'E-mail',
  },
  {
    accessorKey: 'role',
    header: 'Papel',
    cell: ({ row }: any) => {
      const role = row.original.role;
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}>{getRoleLabel(role)}</span>;
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Criado em',
    cell: ({ row }: any) => DateFormatter.dateTime(row.original.created_at),
  },
  {
    accessorKey: 'updated_at',
    header: 'Atualizado em',
    cell: ({ row }: any) => DateFormatter.dateTime(row.original.updated_at),
  },
  {
    accessorKey: 'actions',
    header: 'Ações',
    cell: function ActionsCell({ row }: any) {
      const user = row.original;

      return (
        <div className="flex items-center gap-2">
          <EditUserButton user={user} />
          <DeleteUserButton user={user} />
        </div>
      );
    },
  },
];
