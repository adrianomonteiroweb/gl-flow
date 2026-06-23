'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FilePlus2, Printer, Pencil, Trash2, FileText } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { DateFormatter } from '@workspace/utils';
import { getLeadProposalDocuments, deleteProposalDocument } from '@/actions/proposal-documents';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';

import { ProposalDocumentDialog } from './proposal-document-dialog';

interface LeadProposalsSectionProps {
  leadId: string;
  chatId?: string;
  lead?: any;
}

export const LeadProposalsSection = ({ leadId, chatId, lead }: LeadProposalsSectionProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeadProposalDocuments(leadId);
      if (res.success) setDocuments(res.data || []);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleDelete = async (id: string): Promise<void> => {
    if (deletingDocumentId) {
      return;
    }

    try {
      setDeletingDocumentId(id);
      const res = await deleteProposalDocument(id);
      if (!res.success) {
        toast.error(res.error ?? 'Erro ao remover documento.');
        return;
      }

      toast.success('Documento removido.');
      await fetchDocs();
    } catch {
      toast.error('Erro ao remover documento.');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  if (!chatId) {
    return <p className="py-8 text-center text-sm text-gray-500">Conversa indisponível.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Documentos</h4>
        <ProposalDocumentDialog
          chatId={chatId}
          leadId={leadId}
          lead={lead}
          onSaved={fetchDocs}
          trigger={
            <Button size="sm" variant="outline">
              <FilePlus2 className="mr-1 h-4 w-4" />
              Novo
            </Button>
          }
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : documents.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Nenhum documento gerado.
        </div>
      ) : (
        <ul className="space-y-2">
          {documents.map(doc => (
            <li key={doc.id} className="rounded-md border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{DateFormatter.dateTime(doc.created_at)}</p>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <ProposalDocumentDialog
                  chatId={chatId}
                  leadId={leadId}
                  lead={lead}
                  document={doc}
                  onSaved={fetchDocs}
                  trigger={
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar documento">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Imprimir / Gerar PDF"
                  onClick={() => window.open(`/proposals/${doc.id}/print`, '_blank', 'noopener')}>
                  <Printer className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Remover documento">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação removerá o documento <strong>{doc.title}</strong> e não poderá ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deletingDocumentId === doc.id}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={deletingDocumentId === doc.id}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={event => {
                          event.preventDefault();
                          void handleDelete(doc.id);
                        }}>
                        {deletingDocumentId === doc.id ? 'Removendo...' : 'Remover'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
