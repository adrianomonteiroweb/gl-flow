'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { createProduct, updateProduct } from '@/actions/products';
import { DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Label } from '@workspace/ui/components/label';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@workspace/ui/components/select';
import { Switch } from '@workspace/ui/components/switch';
import { Separator } from '@workspace/ui/components/separator';
import { Button } from '@workspace/ui/components/button';

type ProductFormMode = 'create' | 'edit' | 'view';

interface ProductFormProps {
  mode: ProductFormMode;
  product?: any;
  onClose: () => void;
}

const TITLES: Record<ProductFormMode, string> = {
  create: 'Novo Produto',
  edit: 'Editar Produto',
  view: 'Detalhes do Produto',
};

export const ProductForm = ({ mode, product, onClose }: ProductFormProps) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoyalty, setIsLoyalty] = useState(product?.is_loyalty ?? false);
  const [productType, setProductType] = useState(product?.type || 'internet_plan');

  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isDisabled = isView;

  const getInputValue = (name: string): string => {
    if (!formRef.current) return '';
    const el = formRef.current.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    return el?.value ?? '';
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    const name = getInputValue('name');
    const code = isEdit ? product.code : getInputValue('code');

    if (!code || !name) {
      toast.error('Código e Nome são obrigatórios.');
      return;
    }

    setIsSubmitting(true);

    try {
      const download = getInputValue('download');
      const upload = getInputValue('upload');
      const specs = download || upload
        ? { ...(product?.specs ?? {}), download: download || undefined, upload: upload || undefined }
        : product?.specs ?? undefined;

      const payload = {
        code,
        name,
        description: getInputValue('description') || undefined,
        type: productType as 'internet_plan' | 'combo' | 'addon_service' | 'benefit',
        category: getInputValue('category') || undefined,
        base_price: getInputValue('base_price') || undefined,
        payment_method: getInputValue('payment_method') || undefined,
        is_loyalty: isLoyalty,
        loyalty_months: getInputValue('loyalty_months') ? Number(getInputValue('loyalty_months')) : undefined,
        loyalty_price: getInputValue('loyalty_price') || undefined,
        specs,
      };

      const result = isEdit
        ? await updateProduct(product.id, payload)
        : await createProduct(payload as any);

      if (!result.success) {
        toast.error(result.error ?? `Erro ao ${isEdit ? 'atualizar' : 'criar'} produto.`);
        setIsSubmitting(false);
        return;
      }

      toast.success(`Produto ${isEdit ? 'atualizado' : 'criado'} com sucesso.`);
      document.dispatchEvent(new Event('products:updated'));
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

      <div ref={formRef} className="space-y-5 py-4 mt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code-input">Código</Label>
            <Input
              id="code-input"
              name="code"
              defaultValue={product?.code}
              placeholder="Ex: PLANO-100"
              required
              disabled={isEdit || isView}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name-input">Nome</Label>
            <Input
              id="name-input"
              name="name"
              defaultValue={product?.name}
              placeholder="Ex: Plano 100 Mega"
              required
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description-input">Descrição</Label>
          <Textarea
            id="description-input"
            name="description"
            defaultValue={product?.description ?? ''}
            placeholder="Descrição do produto"
            disabled={isDisabled}
            className="min-h-[72px] resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type-input">Tipo</Label>
            <Select value={productType} onValueChange={setProductType} disabled={isDisabled}>
              <SelectTrigger id="type-input" className="w-full">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internet_plan">Plano de Internet</SelectItem>
                <SelectItem value="combo">Combo</SelectItem>
                <SelectItem value="addon_service">Serviço Adicional</SelectItem>
                <SelectItem value="benefit">Benefício</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-input">Categoria</Label>
            <Input
              id="category-input"
              name="category"
              defaultValue={product?.category ?? ''}
              placeholder="Ex: fibra, radio, tv"
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="download-input">Velocidade Download</Label>
            <Input
              id="download-input"
              name="download"
              defaultValue={product?.specs?.download ?? ''}
              placeholder="Ex: 100 Mbps"
              disabled={isDisabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="upload-input">Velocidade Upload</Label>
            <Input
              id="upload-input"
              name="upload"
              defaultValue={product?.specs?.upload ?? ''}
              placeholder="Ex: 50 Mbps"
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="base_price-input">Preço (R$)</Label>
            <Input
              id="base_price-input"
              name="base_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.base_price ?? ''}
              placeholder="Ex: 99.90"
              disabled={isDisabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment_method-input">Método de Pagamento</Label>
            <Input
              id="payment_method-input"
              name="payment_method"
              defaultValue={product?.payment_method ?? ''}
              placeholder="Ex: Débito em conta"
              disabled={isDisabled}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="is_loyalty-input"
              checked={isLoyalty}
              onCheckedChange={setIsLoyalty}
              disabled={isDisabled}
            />
            <Label htmlFor="is_loyalty-input" className="cursor-pointer">
              Fidelidade
            </Label>
            <input type="hidden" name="is_loyalty" value={isLoyalty ? 'true' : 'false'} />
          </div>

          {isLoyalty && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="loyalty_months-input">Meses de Fidelidade</Label>
                <Input
                  id="loyalty_months-input"
                  name="loyalty_months"
                  type="number"
                  min="0"
                  defaultValue={product?.loyalty_months ?? ''}
                  placeholder="Ex: 12"
                  disabled={isDisabled}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="loyalty_price-input">Preço Fidelidade (R$)</Label>
                <Input
                  id="loyalty_price-input"
                  name="loyalty_price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.loyalty_price ?? ''}
                  placeholder="Ex: 79.90"
                  disabled={isDisabled}
                />
              </div>
            </div>
          )}
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
