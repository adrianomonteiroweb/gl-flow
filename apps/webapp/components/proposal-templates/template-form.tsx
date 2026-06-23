'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createProposalTemplate, updateProposalTemplate } from '@/actions/proposal-templates';
import { DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Label } from '@workspace/ui/components/label';
import { Input } from '@workspace/ui/components/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@workspace/ui/components/select';
import { Button } from '@workspace/ui/components/button';
import { TemplateEditor } from './editor/template-editor';

type TemplateFormMode = 'create' | 'edit' | 'view';

type TemplateCategory = 'proposta' | 'contrato' | 'termo';

interface TemplateFormProps {
  mode: TemplateFormMode;
  template?: any;
  onClose: () => void;
}

const TITLES: Record<TemplateFormMode, string> = {
  create: 'Novo Modelo',
  edit: 'Editar Modelo',
  view: 'Detalhes do Modelo',
};

const DEFAULT_CONTENT = '<h1>Novo modelo</h1><p></p>';

export const TemplateForm = ({ mode, template, onClose }: TemplateFormProps) => {
  const [name, setName] = useState<string>(template?.name ?? '');
  const [description, setDescription] = useState<string>(template?.description ?? '');
  const [category, setCategory] = useState<TemplateCategory>((template?.category as TemplateCategory) ?? 'proposta');
  const [content, setContent] = useState<string>(template?.content ?? DEFAULT_CONTENT);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const handleSave = async () => {
    if (isSubmitting) return;

    if (!name.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        content,
      };

      const result = isEdit
        ? await updateProposalTemplate(template.id, payload)
        : await createProposalTemplate(payload);

      if (!result.success) {
        toast.error(result.error ?? `Erro ao ${isEdit ? 'atualizar' : 'criar'} modelo.`);
        setIsSubmitting(false);
        return;
      }

      toast.success(`Modelo ${isEdit ? 'atualizado' : 'criado'} com sucesso.`);
      document.dispatchEvent(new Event('proposal-templates:updated'));
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{TITLES[mode]}</DialogTitle>
      </DialogHeader>

      <div className="mt-2 space-y-4 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="template-name">Nome</Label>
            <Input
              id="template-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Termo de Adesão"
              disabled={isView}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="template-category">Categoria</Label>
            <Select value={category} onValueChange={value => setCategory(value as TemplateCategory)} disabled={isView}>
              <SelectTrigger id="template-category" className="w-full">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposta">Proposta</SelectItem>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="termo">Termo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-description">Descrição</Label>
          <Input
            id="template-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Breve descrição (opcional)"
            disabled={isView}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Conteúdo</Label>
          <TemplateEditor content={content} onChange={setContent} editable={!isView} />
        </div>
      </div>

      {!isView && (
        <DialogFooter>
          <Button type="button" disabled={isSubmitting} onClick={handleSave}>
            {isSubmitting ? 'Aguarde...' : 'Salvar'}
          </Button>
        </DialogFooter>
      )}
    </div>
  );
};
