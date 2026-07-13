'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CalendarIcon } from 'lucide-react';
import { format } from '@workspace/utils/date';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Switch } from '@workspace/ui/components/switch';
import { DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { ToggleGroup, ToggleGroupItem } from '@workspace/ui/components/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { Calendar } from '@workspace/ui/components/calendar';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { cn } from '@workspace/ui/lib/utils';

import { createVehicleModel, updateVehicleModel } from '@/actions/vehicle-catalog';
import { CONDITION_LABELS } from '@/lib/vehicles/segments';
import { formatCurrencyInput, parseCurrencyInput, toCurrencyDisplay } from '@/lib/vehicles/currency-mask';
import { ImageUploadField } from './image-upload-field';
import type { VehicleModel } from './types';

const formSchema = z
  .object({
    condition: z.string().min(1),
    make: z.string().min(1, 'Marca é obrigatória'),
    model: z.string().min(1, 'Modelo é obrigatório'),
    price: z
      .string()
      .min(1, 'Informe o preço')
      .refine(value => parseCurrencyInput(value) > 0, 'Preço inválido'),
    image_url: z.string().nullable().optional(),
    is_active: z.boolean(),
    mileage: z.string().optional(),
    stock_entry_date: z.string().optional(),
    chassi: z.string().max(17, 'Chassi deve ter no máximo 17 caracteres').optional(),
    color: z.string().max(50).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.condition === 'used') {
      if (!data.mileage || data.mileage.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quilometragem é obrigatória', path: ['mileage'] });
      }

      if (!data.stock_entry_date) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data de entrada é obrigatória', path: ['stock_entry_date'] });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface VehicleModelFormProps {
  model?: VehicleModel;
  onSaved: () => void;
  onCancel: () => void;
}

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 pt-2">
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const CONDITION_TOGGLE_CLASSES: Record<string, string> = {
  new: 'data-[state=on]:bg-emerald-500/10 data-[state=on]:text-emerald-700 data-[state=on]:border-emerald-500 dark:data-[state=on]:text-emerald-400',
  used: 'data-[state=on]:bg-amber-500/10 data-[state=on]:text-amber-700 data-[state=on]:border-amber-500 dark:data-[state=on]:text-amber-400',
};

const toDefaults = (model?: VehicleModel): FormValues => {
  const payload = model?.payload ?? {};

  return {
    condition: model?.condition ?? 'new',
    make: model?.make ?? 'Honda',
    model: model?.model ?? '',
    price: model?.price !== null && model?.price !== undefined ? toCurrencyDisplay(model.price) : '',
    image_url: model?.image_url ?? null,
    is_active: model?.is_active ?? true,
    mileage: payload.mileage ? String(payload.mileage) : '',
    stock_entry_date: payload.stock_entry_date ?? '',
    chassi: payload.chassi ?? '',
    color: payload.color ?? '',
  };
};

export const VehicleModelForm = ({ model, onSaved, onCancel }: VehicleModelFormProps) => {
  const isEditing = !!model;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toDefaults(model),
    mode: 'onSubmit',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const condition = form.watch('condition');
  const isUsed = condition === 'used';

  const handleValid = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      const payload = {
        condition: values.condition,
        make: values.make.trim(),
        model: values.model,
        price: parseCurrencyInput(values.price),
        image_url: values.image_url ?? null,
        is_active: values.is_active,
        mileage: isUsed && values.mileage ? Number(values.mileage.replace(/\D/g, '')) : null,
        stock_entry_date: isUsed ? values.stock_entry_date || null : null,
        chassi: values.chassi?.trim().toUpperCase() || null,
        color: values.color?.trim() || null,
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

  const handleConditionChange = (val: string) => {
    if (!val) {
      return;
    }

    form.setValue('condition', val);

    if (val === 'new') {
      form.setValue('mileage', '');
      form.setValue('stock_entry_date', '');
    }
  };

  const selectedDate = form.watch('stock_entry_date');
  const parsedDate = selectedDate ? new Date(selectedDate + 'T12:00:00') : undefined;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid, handleInvalid)} className="flex flex-1 flex-col min-h-0">
        <div className="shrink-0 px-6 pt-6">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar veículo' : 'Novo veículo'}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {isEditing ? (
            <div className={cn(
              'inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium',
              condition === 'new'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
            )}>
              {CONDITION_LABELS[condition as keyof typeof CONDITION_LABELS] ?? condition}
            </div>
          ) : (
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
                      onValueChange={handleConditionChange}
                      variant="outline"
                      className="w-full"
                      aria-label="Condição do veículo"
                    >
                      {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                        <ToggleGroupItem
                          key={value}
                          value={value}
                          className={cn('flex-1', CONDITION_TOGGLE_CLASSES[value])}
                        >
                          {label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* Identificação */}
          <SectionHeader>Identificação</SectionHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="make"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Honda" {...field} />
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
                  <FormLabel>Modelo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: CG 160 Titan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

          {/* Detalhes — seminovo only */}
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-200 ease-out',
              isUsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            )}
          >
            <div className="overflow-hidden" aria-live="polite">
              {isUsed && (
                <div className="space-y-5 pt-1">
                  <SectionHeader>Detalhes do seminovo</SectionHeader>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quilometragem *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                inputMode="numeric"
                                placeholder="0"
                                {...field}
                                value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value.replace(/\D/g, ''))}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                km
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stock_entry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de entrada *</FormLabel>
                          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value
                                    ? format(new Date(field.value + 'T12:00:00'), 'dd/MM/yyyy')
                                    : 'Selecione a data'}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={parsedDate}
                                onSelect={date => {
                                  if (date) {
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    field.onChange(`${year}-${month}-${day}`);
                                  } else {
                                    field.onChange('');
                                  }

                                  setCalendarOpen(false);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Estoque */}
          <SectionHeader>Estoque</SectionHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="chassi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chassi</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 9C2KC1670NR000001"
                      maxLength={17}
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Vermelho" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Preço */}
          <SectionHeader>Preço</SectionHeader>

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (R$) *</FormLabel>
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

          {/* Ativo */}
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

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4 flex flex-row justify-between gap-2">
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
