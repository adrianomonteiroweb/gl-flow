'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useFormContext, type FieldPath } from 'react-hook-form';

import { onlyNumbers } from '@workspace/utils/text';
import { Input } from '@workspace/ui/components/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { lookupAddressByZip } from '@/actions/cep';

import { formatZip, type ClientFormValues } from './client-form-schema';

type AddressFieldsProps = {
  pathPrefix: string;
  disabled?: boolean;
  online?: boolean;
};

export const AddressFields = ({ pathPrefix, disabled = false, online = true }: AddressFieldsProps) => {
  const form = useFormContext<ClientFormValues>();
  const [isZipLoading, setIsZipLoading] = useState(false);
  const last_fetched_zip_ref = useRef<string>('');

  const fieldName = (suffix: string): FieldPath<ClientFormValues> => `${pathPrefix}.${suffix}` as FieldPath<ClientFormValues>;
  const zipName = fieldName('zipCode');
  const zipValue = form.watch(zipName) as string | undefined;

  useEffect(() => {
    const digits = onlyNumbers(zipValue ?? '');

    if (digits.length !== 8 || digits === last_fetched_zip_ref.current || !online) {
      return;
    }

    last_fetched_zip_ref.current = digits;
    let cancelled = false;

    const run = async (): Promise<void> => {
      setIsZipLoading(true);

      try {
        const result = await lookupAddressByZip(digits);

        if (cancelled || !result) {
          return;
        }

        const current = form.getValues(pathPrefix as FieldPath<ClientFormValues>) as Record<string, string> | undefined;

        if (!current?.street && result.street) {
          form.setValue(fieldName('street'), result.street, { shouldValidate: true });
        }

        if (!current?.neighborhood && result.neighborhood) {
          form.setValue(fieldName('neighborhood'), result.neighborhood, { shouldValidate: true });
        }

        if (!current?.city && result.city) {
          form.setValue(fieldName('city'), result.city, { shouldValidate: true });
        }

        if (!current?.state && result.state) {
          form.setValue(fieldName('state'), result.state, { shouldValidate: true });
        }
      } finally {
        if (!cancelled) {
          setIsZipLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [zipValue, online, pathPrefix]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FormField
          control={form.control}
          name={zipName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    value={(field.value as string) ?? ''}
                    onChange={e => field.onChange(formatZip(e.target.value))}
                    placeholder="00000-000"
                    inputMode="numeric"
                    disabled={disabled}
                  />
                  {isZipLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={fieldName('street')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço *</FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ''} placeholder="Rua, Avenida..." disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={fieldName('number')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número *</FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ''} placeholder="Nº" disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={fieldName('neighborhood')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bairro *</FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ''} placeholder="Bairro" disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <FormField
          control={form.control}
          name={fieldName('complement')}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Complemento *</FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ''} placeholder="Apto, bloco, sala..." disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={fieldName('city')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade *</FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ''} placeholder="Cidade" disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={fieldName('state')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>UF *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string) ?? ''}
                  onChange={e => field.onChange(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  maxLength={2}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
