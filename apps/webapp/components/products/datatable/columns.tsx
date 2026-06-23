'use client';

import { DateFormatter } from '@workspace/utils';
import { ViewProductButton } from '../view-button';
import { EditProductButton } from '../edit-button';
import { DeleteProductButton } from '../delete-button';

const TYPE_LABELS: Record<string, string> = {
  internet_plan: 'Plano de Internet',
  combo: 'Combo',
  addon_service: 'Serviço Adicional',
  physical: 'Produto Físico',
  benefit: 'Benefício',
};

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inativo', color: 'bg-secondary text-secondary-foreground' },
  archived: { label: 'Arquivado', color: 'bg-red-100 text-red-800' },
};

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  voalle: 'Voalle',
  hubsoft: 'Hubsoft',
  mk: 'MK',
  ixc: 'IXC',
};

const formatCurrency = (value: string | null): string => {
  if (!value) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
};

export const columns: any = [
  {
    accessorKey: 'name',
    header: 'Nome',
  },
  {
    accessorKey: 'code',
    header: 'Código',
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }: any) => {
      const type = row.original.type;
      return <span>{TYPE_LABELS[type] ?? type}</span>;
    },
  },
  {
    accessorKey: 'base_price',
    header: 'Preço',
    cell: ({ row }: any) => formatCurrency(row.original.base_price),
  },
  {
    accessorKey: 'source',
    header: 'Origem',
    cell: ({ row }: any) => {
      const source = row.original.source;
      return <span>{SOURCE_LABELS[source] ?? source}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }: any) => {
      const status = row.original.status;
      const style = STATUS_STYLES[status] ?? { label: status, color: 'bg-secondary text-secondary-foreground' };
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.color}`}>{style.label}</span>;
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Criado em',
    cell: ({ row }: any) => DateFormatter.dateTime(row.original.created_at),
  },
  {
    accessorKey: 'actions',
    header: 'Ações',
    cell: function ActionsCell({ row }: any) {
      const product = row.original;

      return (
        <div className="flex items-center gap-2">
          <ViewProductButton product={product} />
          <EditProductButton product={product} />
          <DeleteProductButton product={product} />
        </div>
      );
    },
  },
];
