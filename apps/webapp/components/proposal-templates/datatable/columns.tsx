'use client';

import { DateFormatter } from '@workspace/utils';
import { PencilIcon, EyeIcon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { TemplateDialog } from '../template-dialog';
import { DeleteTemplateButton } from '../delete-button';

const CATEGORY_LABELS: Record<string, string> = {
  proposta: 'Proposta',
  contrato: 'Contrato',
  termo: 'Termo',
};

export const columns: any = [
  {
    accessorKey: 'name',
    header: 'Nome',
  },
  {
    accessorKey: 'category',
    header: 'Categoria',
    cell: ({ row }: any) => {
      const category = row.original.category;
      return <span>{CATEGORY_LABELS[category] ?? category}</span>;
    },
  },
  {
    accessorKey: 'description',
    header: 'Descrição',
    cell: ({ row }: any) => <span className="text-muted-foreground">{row.original.description || '—'}</span>,
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
      const template = row.original;

      return (
        <div className="flex items-center gap-2">
          <TemplateDialog
            mode="view"
            template={template}
            trigger={
              <Button variant="outline" title="Visualizar Modelo">
                <EyeIcon className="h-4 w-4" />
              </Button>
            }
          />
          <TemplateDialog
            mode="edit"
            template={template}
            trigger={
              <Button variant="outline" title="Editar Modelo">
                <PencilIcon className="h-4 w-4" />
              </Button>
            }
          />
          <DeleteTemplateButton template={template} />
        </div>
      );
    },
  },
];
