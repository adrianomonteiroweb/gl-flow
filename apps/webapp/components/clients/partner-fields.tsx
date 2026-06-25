'use client';

import { Trash2 } from 'lucide-react';
import { useFormContext, type FieldPath } from 'react-hook-form';

import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { MARITAL_STATUS_OPTIONS } from '@/lib/clients/marital-status';

import { AddressFields } from './address-fields';
import { formatCpfInput, formatPhone, type ClientFormValues } from './client-form-schema';

type PartnerFieldsProps = {
  index: number;
  online?: boolean;
  autoFetch?: boolean;
  onRemove: () => void;
};

export const PartnerFields = ({ index, online = true, autoFetch = true, onRemove }: PartnerFieldsProps) => {
  const form = useFormContext<ClientFormValues>();
  const base = `partners.${index}`;
  const fieldName = (suffix: string): FieldPath<ClientFormValues> => `${base}.${suffix}` as FieldPath<ClientFormValues>;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-foreground">Sócio {index + 1}</h5>
        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name={fieldName('document')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string) ?? ''}
                  onChange={e => field.onChange(formatCpfInput(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={fieldName('name')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo *</FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ''} placeholder="Ex: João da Silva" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField
          control={form.control}
          name={fieldName('phone')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string) ?? ''}
                  onChange={e => field.onChange(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={fieldName('email')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail *</FormLabel>
              <FormControl>
                <Input {...field} type="email" value={(field.value as string) ?? ''} placeholder="nome@email.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={fieldName('birth_date')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nascimento *</FormLabel>
              <FormControl>
                <Input {...field} type="date" value={(field.value as string) ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={fieldName('marital_status')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado civil *</FormLabel>
              <Select value={(field.value as string) ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MARITAL_STATUS_OPTIONS.map(option => (
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

      <FormField
        control={form.control}
        name={fieldName('has_cnh')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Possui CNH? *</FormLabel>
            <FormControl>
              <RadioGroup
                className="flex flex-row gap-6"
                value={field.value ? 'sim' : 'nao'}
                onValueChange={value => field.onChange(value === 'sim')}>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="sim" /> Sim
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="nao" /> Não
                </label>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <AddressFields pathPrefix={`${base}.address`} online={online} autoFetch={autoFetch} />
    </div>
  );
};
