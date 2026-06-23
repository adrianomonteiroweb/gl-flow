'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { getProposalDocument } from '@/actions/proposal-documents';
import '@/components/proposal-templates/editor/proposal-document.css';

const PRINT_CSS = `
  .proposal-print-screen { position: fixed; inset: 0; overflow: auto; background: #e5e7eb; }
  .proposal-paper {
    width: 210mm;
    max-width: 100%;
    margin: 24px auto;
    background: #fff;
    padding: 18mm 16mm;
    box-shadow: 0 1px 10px rgba(0,0,0,0.18);
  }
  @media print {
    html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
    .no-print { display: none !important; }
    .proposal-print-screen { position: static !important; overflow: visible !important; background: #fff !important; }
    .proposal-paper { width: auto; max-width: none; margin: 0; padding: 0; box-shadow: none; }
    @page { size: A4; margin: 15mm; }
  }
`;

export default function ProposalPrintPage() {
  const params = useParams();
  const documentId = params.documentId as string;

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printedRef = useRef(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const res = await getProposalDocument(documentId);

      if (!active) {
        return;
      }

      if (res.success) {
        setDoc(res.data);
      } else {
        setError(res.error ?? 'Documento não encontrado');
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [documentId]);

  // Auto-open the print dialog once the document is rendered.
  useEffect(() => {
    if (doc && !printedRef.current) {
      printedRef.current = true;
      const timer = setTimeout(() => window.print(), 600);

      return () => clearTimeout(timer);
    }
  }, [doc]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Carregando documento...</div>;
  }

  if (error || !doc) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">{error ?? 'Documento não encontrado'}</div>;
  }

  return (
    <div className="proposal-print-screen">
      <style>{PRINT_CSS}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white/90 px-4 py-2 backdrop-blur">
        <span className="truncate text-sm font-medium">{doc.title}</span>
        <Button type="button" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="proposal-paper">
        <div className="proposal-document" dangerouslySetInnerHTML={{ __html: doc.content }} />
      </div>
    </div>
  );
}
