'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Switch } from '@workspace/ui/components/switch';
import { DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group';
import { SubmitButton } from '@workspace/ui/components/submit-button';

import { createVehicleModel, updateVehicleModel } from '@/actions/vehicle-catalog';
import { SEGMENT_OPTIONS, CONDITION_LABELS } from '@/lib/vehicles/segments';
import { formatCurrencyInput, parseCurrencyInput, toCurrencyDisplay } from '@/lib/vehicles/currency-mask';
import { ImageUploadField } from './image-upload-field';
import { YearQuickSelect } from './year-quick-select';
import type { VehicleModel } from './types';

const formSchema = z.object({
  condition: z.string().min(1),
  model: z.string().min(1, 'Modelo é obrigatório'),
  version: z.string().optional(),
  segment: z.string().min(1, 'Selecione o segmento'),
  model_year: z.string().optional(),
  manufacture_year: z.string().optional(),
  price: z.string().min(1, 'Informe o preço').refine(value => parseCurrencyInput(value) > 0, 'Preço inválido'),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface VehicleModelFormProps {
  model?: VehicleModel;
  onSaved: () => void;
  onCancel: () => void;
}

const toDefaults = (model?: VehicleModel): FormValues => ({
  condition: model?.condition ?? 'new',
  model: model?.model ?? '',
  version: model?.version ?? '',
  segment: model?.segment ?? '',
  model_year: model?.model_year ? String(model.model_year) : '',
  manufacture_year: model?.manufacture_year ? String(model.manufacture_year) : '',
  price: model?.price !== null && model?.price !== undefined ? toCurrencyDisplay(model.price) : '',
  image_url: model?.image_url ?? null,
  is_active: model?.is_active ?? true,
});

export const VehicleModelForm = ({ model, onSaved, onCancel }: VehicleModelFormProps) => {
  const isEditing = !!model;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toDefaults(model),
    mode: 'onSubmit',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleValid = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      const payload = {
        condition: values.condition,
        model: values.model,
        version: values.version?.trim() || null,
        segment: values.segment,
        model_year: values.model_year ? Number(values.model_year) : null,
        manufacture_year: values.manufacture_year ? Number(values.manufacture_year) : null,
        price: parseCurrencyInput(values.price),
        image_url: values.image_url ?? null,
        is_active: values.is_active,
      };

      const result = isEditing ? await updateVehicleModel(model.id, payload) : await createVehicleModel(payload);

      if (!result.success) {
        toast.error(result.error ?? 'Erro ao salvar o veículo.');
        return;
      }

      toast.success(isEditing ? 'Veículo atualizado.' : 'Veículo adicionado ao catálogo.');
      document.dispatchEvent(new Event('vehicle-models:updated'));
      onSaved();
    } catch {
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvalid = () => {
    toast.error('Preencha os campos obrigatórios destacados.');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid, handleInvalid)}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condição</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={val => {
                      if (val) {
                        field.onChange(val);
                      }
                    }}
                    variant="outline"
                    className="w-full"
                    aria-label="Condição do veículo"
                  >
                    {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                      <ToggleGroupItem
                        key={value}
                        value={value}
                        className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:shadow-sm"
                      >
                        {label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="image_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagem</FormLabel>
                <FormControl>
                  <ImageUploadField value={field.value} onChange={field.onChange} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex.: CG 160 Titan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versão</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="segment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Segmento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SEGMENT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="manufacture_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano fabricação</FormLabel>
                  <FormControl>
                    <YearQuickSelect value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano modelo</FormLabel>
                  <FormControl>
                    <YearQuickSelect value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (R$)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      inputMode="numeric"
                      placeholder="0,00"
                      className="pl-10"
                      value={field.value}
                      onChange={e => field.onChange(formatCurrencyInput(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <FormLabel className="text-sm font-medium">Ativo no catálogo</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="mt-6 flex flex-row justify-between gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <div className="flex-1" />
          <SubmitButton isSubmitting={isSubmitting}>Salvar</SubmitButton>
        </DialogFooter>
      </form>
    </Form>
  );
};
