'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Braces, Eye, Printer, Save } from 'lucide-react';

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetFooter } from '@workspace/ui/components/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@workspace/ui/components/select';
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { cn } from '@workspace/ui/lib/utils';
import { getActiveProposalTemplates } from '@/actions/proposal-templates';
import { buildProposalContext, createProposalDocument, updateProposalDocument } from '@/actions/proposal-documents';
import { resolveTemplateHtml, extractTokens, getVariableLabel, normalizeVariableValue } from '@/lib/proposals/variables';
import { TemplateEditor } from '@/components/proposal-templates/editor/template-editor';
import { LeadDetailsContent } from '@/components/leads/lead-details-panel';
import '@/components/proposal-templates/editor/proposal-document.css';

interface ProposalDocumentDialogProps {
  chatId: string;
  leadId: string;
  lead?: any;
  /** Existing saved document to reopen/edit. */
  document?: any;
  trigger: React.ReactNode;
  onSaved?: () => void;
}

const PRODUCT_VARIABLE_TOKENS = ['ITEM.DESCRICAO', 'CONEXAO.DOWNLOADMAX', 'CONEXAO.UPLOADMAX', 'CONTRATO.VALOR'];
const PRODUCT_VARIABLE_TOKEN_SET = new Set<string>(PRODUCT_VARIABLE_TOKENS);

const getEditableOverrides = (values?: Record<string, string> | null): Record<string, string> => {
  const editableValues = { ...(values ?? {}) };

  for (const token of PRODUCT_VARIABLE_TOKENS) {
    delete editableValues[token];
  }

  return editableValues;
};

export const ProposalDocumentDialog = ({ chatId, leadId, lead, document: existingDoc, trigger, onSaved }: ProposalDocumentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(existingDoc?.template_id ?? null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(existingDoc?.payload?.productId ?? null);

  const [title, setTitle] = useState<string>(existingDoc?.title ?? '');
  const [editorContent, setEditorContent] = useState<string>(existingDoc?.payload?.editorContent ?? existingDoc?.content ?? '');
  const [autoValues, setAutoValues] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, string>>(() => getEditableOverrides(existingDoc?.payload?.values));
  const [editorKey, setEditorKey] = useState(0);
  const [mobileView, setMobileView] = useState<'editor' | 'lead'>('editor');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [missingVariablesAlertOpen, setMissingVariablesAlertOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'save' | 'generatePdf' | null>(null);
  const variablesSectionRef = useRef<HTMLDivElement | null>(null);

  const mergedValues = useMemo(() => {
    const raw = { ...autoValues, ...overrides };
    const normalized: Record<string, string> = {};
    for (const [token, value] of Object.entries(raw)) {
      normalized[token] = normalizeVariableValue(token, value);
    }
    return normalized;
  }, [autoValues, overrides]);
  const tokens = useMemo(() => extractTokens(editorContent), [editorContent]);
  const resolvedHtml = useMemo(() => resolveTemplateHtml(editorContent, mergedValues), [editorContent, mergedValues]);
  const hasMissingProductValues = useMemo(
    () => tokens.some(token => PRODUCT_VARIABLE_TOKEN_SET.has(token) && !mergedValues[token]),
    [tokens, mergedValues]
  );
  const missingVariableCount = useMemo(
    () => tokens.filter(token => !PRODUCT_VARIABLE_TOKEN_SET.has(token) && !mergedValues[token]).length,
    [tokens, mergedValues]
  );

  const loadContext = useCallback(
    async (productId?: string | null) => {
      const res = await buildProposalContext(chatId, productId ?? undefined);

      if (res.success) {
        setAutoValues(res.data.values);
        setProductOptions(res.data.productOptions || []);

        if (!productId && res.data.selectedProductId) {
          setSelectedProductId(res.data.selectedProductId);
        }
      }
    },
    [chatId]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setLoading(true);
    (async () => {
      const tplRes = await getActiveProposalTemplates(chatId);

      if (active && tplRes.success) {
        setTemplates(tplRes.data || []);
      }

      await loadContext(existingDoc?.payload?.productId ?? null);

      if (active) {
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, loadContext, existingDoc]);

  const handleSelectTemplate = (id: string) => {
    const template = templates.find(t => t.id === id);

    if (!template) {
      return;
    }

    setSelectedTemplateId(id);
    setEditorContent(template.content);
    setEditorKey(key => key + 1);

    if (!title) {
      setTitle(template.name);
    }
  };

  const handleProductChange = async (id: string) => {
    setSelectedProductId(id);
    setOverrides(prev => {
      const next = { ...prev };
      for (const token of PRODUCT_VARIABLE_TOKENS) delete next[token];
      return next;
    });
    await loadContext(id);
  };

  const handleLeadChange = useCallback(() => {
    void loadContext(selectedProductId);
  }, [loadContext, selectedProductId]);

  const maskInput = (token: string, value: string): string => {
    if (token === 'PESSOA.CPF') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    if (token === 'PESSOA.DATANASCIMENTO') {
      const digits = value.replace(/\D/g, '').slice(0, 8);
      return digits.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
    }
    return value;
  };

  const setOverride = (token: string, value: string) => setOverrides(prev => ({ ...prev, [token]: maskInput(token, value) }));

  const getMissingVariables = (): string[] => {
    return tokens.filter(token => !PRODUCT_VARIABLE_TOKEN_SET.has(token) && !mergedValues[token]);
  };

  const persist = async (): Promise<string | null> => {
    if (!title.trim()) {
      toast.error('Informe um título para o documento.');
      return null;
    }

    if (!editorContent.trim()) {
      toast.error('Selecione um modelo.');
      return null;
    }

    const params = {
      title: title.trim(),
      content: resolvedHtml,
      status: 'generated' as const,
      values: mergedValues,
      productId: selectedProductId ?? undefined,
      editorContent,
      templateId: selectedTemplateId ?? undefined,
    };

    if (existingDoc?.id) {
      const res = await updateProposalDocument(existingDoc.id, params);

      if (!res.success) {
        toast.error(res.error ?? 'Erro ao salvar documento.');
        return null;
      }

      return existingDoc.id;
    }

    const res = await createProposalDocument({ leadId, chatId, ...params });

    if (!res.success) {
      toast.error(res.error ?? 'Erro ao salvar documento.');
      return null;
    }

    return res.data.id;
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const missingVariables = getMissingVariables();
    if (missingVariables.length > 0) {
      setPendingAction('save');
      setMissingVariablesAlertOpen(true);
      return;
    }

    setSaving(true);
    try {
      const id = await persist();

      if (id) {
        toast.success('Documento salvo com sucesso.');
        onSaved?.();
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (saving) {
      return;
    }

    const missingVariables = getMissingVariables();
    if (missingVariables.length > 0) {
      setPendingAction('generatePdf');
      setMissingVariablesAlertOpen(true);
      return;
    }

    setSaving(true);

    try {
      const id = await persist();

      if (id) {
        onSaved?.();
        window.open(`/proposals/${id}/print`, '_blank', 'noopener');
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    setMissingVariablesAlertOpen(false);
    const action = pendingAction;
    setPendingAction(null);

    if (action === 'save') {
      setSaving(true);
      try {
        const id = await persist();

        if (id) {
          toast.success('Documento salvo com sucesso.');
          onSaved?.();
          setOpen(false);
        }
      } finally {
        setSaving(false);
      }
    } else if (action === 'generatePdf') {
      setSaving(true);

      try {
        const id = await persist();

        if (id) {
          onSaved?.();
          window.open(`/proposals/${id}/print`, '_blank', 'noopener');
          setOpen(false);
        }
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBackToFillMissingVariables = (): void => {
    setMissingVariablesAlertOpen(false);
    setPendingAction(null);
    setPreviewOpen(false);
    setMobileView('editor');
    setVariablesOpen(true);

    requestAnimationFrame(() => {
      variablesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    if (!open) {
      setMobileView('editor');
      setPreviewOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const inset = document.querySelector<HTMLElement>('[data-slot="sidebar-inset"]');
    const externalPanel = document.querySelector<HTMLElement>('[data-slot="lead-details-panel"]');

    const previousPadding = inset?.style.paddingRight;
    const previousTransition = inset?.style.transition;
    const previousPanelDisplay = externalPanel?.style.display;

    if (inset) {
      inset.style.transition = 'padding-right 300ms ease';
    }

    if (externalPanel) {
      externalPanel.style.display = 'none';
    }

    // Keep the chat's reserved space exactly equal to the sheet's rendered width
    // across breakpoints (the sheet width is responsive), avoiding overlap/gaps.
    const syncPadding = () => {
      const sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');

      if (inset && sheet) {
        inset.style.paddingRight = `${sheet.getBoundingClientRect().width}px`;
      }
    };

    const frame = requestAnimationFrame(syncPadding);
    const observer = new ResizeObserver(syncPadding);
    const sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');

    if (sheet) {
      observer.observe(sheet);
    }

    window.addEventListener('resize', syncPadding);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', syncPadding);

      if (inset) {
        inset.style.paddingRight = previousPadding ?? '';
        inset.style.transition = previousTransition ?? '';
      }

      if (externalPanel) {
        externalPanel.style.display = previousPanelDisplay ?? '';
      }
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        hideOverlay
        className="w-[58vw] max-w-none sm:max-w-none xl:w-[50vw] xl:max-w-[1040px] overflow-hidden p-0"
        aria-describedby={undefined}
        onPointerDownOutside={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}>
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle>{existingDoc ? 'Editar documento' : 'Novo documento'}</SheetTitle>
          </SheetHeader>

          {lead ? (
            <div className="shrink-0 border-b bg-background px-6 py-2">
              <Tabs value={mobileView} onValueChange={value => setMobileView(value as 'editor' | 'lead')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="editor">Edição</TabsTrigger>
                  <TabsTrigger value="lead">Informações do lead</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1">
            {lead ? (
              <aside className={cn('min-h-0 bg-white dark:bg-background', mobileView === 'lead' ? 'block' : 'hidden')}>
                <ScrollArea className="h-full">
                  <div className="mx-auto w-full max-w-xl">
                    <LeadDetailsContent lead={lead} chatId={chatId} variant="embedded" onLeadChange={handleLeadChange} />
                  </div>
                </ScrollArea>
              </aside>
            ) : null}

            <div className={cn('min-h-0 overflow-y-auto p-6', mobileView === 'editor' ? 'block' : 'hidden')}>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Modelo</Label>
                    <Select value={selectedTemplateId ?? ''} onValueChange={handleSelectTemplate} disabled={loading}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Plano</Label>
                    <Select value={selectedProductId ?? ''} onValueChange={handleProductChange} disabled={loading || productOptions.length === 0}>
                      <SelectTrigger className={`w-full ${hasMissingProductValues ? 'border-amber-400' : ''}`}>
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {productOptions.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Título</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do documento" />
                  </div>
                </div>

                {editorContent ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-end gap-2">
                      {tokens.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant={variablesOpen ? 'secondary' : 'outline'}
                          onClick={() => setVariablesOpen(prev => !prev)}>
                          <Braces className="mr-1 h-4 w-4" />
                          Variáveis
                          {missingVariableCount > 0 && (
                            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white">
                              {missingVariableCount}
                            </span>
                          )}
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                        <Eye className="mr-1 h-4 w-4" />
                        Pré-visualizar
                      </Button>
                    </div>

                    {variablesOpen && (
                      <div ref={variablesSectionRef} className="space-y-3 rounded-md border p-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {tokens.map(token => {
                            const isProductVariable = PRODUCT_VARIABLE_TOKEN_SET.has(token);
                            const empty = !mergedValues[token];
                            return (
                              <div key={token} className="flex flex-col gap-1">
                                <Label className="text-sm">
                                  {getVariableLabel(token)}
                                  {empty && !isProductVariable && <span className="ml-1 font-medium text-amber-700">• preencher</span>}
                                </Label>
                                <Input
                                  value={mergedValues[token] ?? ''}
                                  onChange={e => {
                                    if (isProductVariable) {
                                      return;
                                    }

                                    setOverride(token, e.target.value);
                                  }}
                                  placeholder={getVariableLabel(token)}
                                  readOnly={isProductVariable}
                                  aria-readonly={isProductVariable}
                                  className={empty ? 'border-amber-400' : ''}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <TemplateEditor key={editorKey} content={editorContent} onChange={setEditorContent} />
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Selecione um modelo para começar.
                  </div>
                )}
              </div>
            </div>
          </div>

          <SheetFooter className="shrink-0 flex-row gap-2 border-t px-6 py-3">
            <Button type="button" variant="outline" disabled={saving || !editorContent} onClick={handleSave}>
              <Save className="mr-1 h-4 w-4" /> Salvar
            </Button>
            <Button type="button" disabled={saving || !editorContent} onClick={handleGeneratePdf}>
              <Printer className="mr-1 h-4 w-4" /> Gerar PDF
            </Button>
          </SheetFooter>

          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent
              aria-describedby={undefined}
              className="flex h-[90vh] w-[min(960px,95vw)] max-w-[960px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px]">
              <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
                <DialogTitle className="truncate pr-8">{title.trim() ? title : 'Pré-visualização do documento'}</DialogTitle>
              </DialogHeader>

              <div className="proposal-preview flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-8">
                <div className="mx-auto w-full max-w-[820px] rounded-md bg-white p-8 shadow-sm sm:p-12">
                  <div className="proposal-document" dangerouslySetInnerHTML={{ __html: resolvedHtml }} />
                </div>
              </div>

              <DialogFooter className="shrink-0 flex-row justify-end gap-2 border-t px-6 py-3">
                <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
                  Fechar
                </Button>
                <Button type="button" disabled={saving || !editorContent} onClick={handleGeneratePdf}>
                  <Printer className="mr-1 h-4 w-4" /> Gerar PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={missingVariablesAlertOpen} onOpenChange={setMissingVariablesAlertOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-amber-700">Variáveis não preenchidas</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">As seguintes variáveis ainda não foram preenchidas:</p>

                <ul className="max-h-64 overflow-y-auto space-y-2 rounded-md border p-3 bg-muted/50">
                  {getMissingVariables().map(token => (
                    <li key={token} className="flex items-center gap-2 text-sm">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-medium">{getVariableLabel(token)}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-muted-foreground">
                  Você pode continuar mesmo com variáveis faltando, mas recomendamos preenchê-las para garantir um documento completo.
                </p>
              </div>

              <DialogFooter className="flex-row gap-2 sm:gap-3">
                <Button type="button" variant="outline" onClick={handleBackToFillMissingVariables}>
                  Voltar e preencher
                </Button>
                <Button type="button" variant="default" onClick={handleConfirmAction} disabled={saving}>
                  Continuar mesmo assim
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SheetContent>
    </Sheet>
  );
};
