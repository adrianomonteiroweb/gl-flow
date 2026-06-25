'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { AlertCircle, Plus } from 'lucide-react';

import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { MARITAL_STATUS_OPTIONS } from '@/lib/clients/marital-status';

import { AddressFields } from './address-fields';
import { PartnerFields } from './partner-fields';
import { emptyPartner, formatPhone, type ClientFormValues } from './client-form-schema';

type ClientFormBodyProps = {
  online?: boolean;
  /** When false, the CEP is never looked up against the address API (e.g. existing client). */
  addressAutoFetch?: boolean;
};

/**
 * Editable fields shared by the create and edit client forms. The identity
 * section (person type + document) lives in each parent because its behaviour
 * differs (lookup on create, locked on edit). Must be rendered inside a
 * FormProvider — it reads the form via context.
 */
export const ClientFormBody = ({ online = true, addressAutoFetch = true }: ClientFormBodyProps) => {
  const form = useFormContext<ClientFormValues>();
  const partners = useFieldArray({ control: form.control, name: 'partners' });

  const personType = form.watch('personType');
  const isCompany = personType === 'pj';
  const partnersError = (form.formState.errors.partners as { message?: string } | undefined)?.message;

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{isCompany ? 'Razão Social' : 'Nome Completo'} *</FormLabel>
            <FormControl>
              <Input {...field} value={(field.value as string) ?? ''} placeholder="Ex: João da Silva" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {isCompany && (
        <FormField
          control={form.control}
          name="tradeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Fantasia</FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ''} placeholder="Ex: Loja Central" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className={`grid grid-cols-2 gap-4 ${isCompany ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
        <FormField
          control={form.control}
          name="phoneSecondary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp {!isCompany ? '*' : ''}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string) ?? ''}
                  onChange={e => field.onChange(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  aria-describedby={!isCompany ? 'contact-requirement' : undefined}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone {!isCompany ? '*' : ''}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string) ?? ''}
                  onChange={e => field.onChange(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  aria-describedby={!isCompany ? 'contact-requirement' : undefined}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
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

        {!isCompany && (
          <FormField
            control={form.control}
            name="birthDate"
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
        )}
      </div>

      {!isCompany && (
        <div
          id="contact-requirement"
          className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
          role="alert"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Informe <strong>WhatsApp</strong> ou <strong>Telefone</strong> — pelo menos um é obrigatório.
          </span>
        </div>
      )}

      {!isCompany && (
        <FormField
          control={form.control}
          name="maritalStatus"
          render={({ field }) => (
            <FormItem className="sm:max-w-xs">
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
      )}

      {isCompany && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="foundingDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de abertura *</FormLabel>
                <FormControl>
                  <Input {...field} type="date" value={(field.value as string) ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Endereço</h4>
        <AddressFields pathPrefix="address" online={online} autoFetch={addressAutoFetch} />
      </div>

      {isCompany && (
        <>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Inscrições</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="municipalRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição municipal</FormLabel>
                    <FormControl>
                      <Input {...field} value={(field.value as string) ?? ''} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stateRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição estadual</FormLabel>
                    <FormControl>
                      <Input {...field} value={(field.value as string) ?? ''} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Sócios *</h4>
              <Button type="button" variant="outline" size="sm" onClick={() => partners.append(emptyPartner())}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar sócio
              </Button>
            </div>

            {partnersError && <p className="mb-2 text-sm text-destructive">{partnersError}</p>}

            <div className="space-y-4">
              {partners.fields.map((item, index) => (
                <PartnerFields
                  key={item.id}
                  index={index}
                  online={online}
                  autoFetch={addressAutoFetch}
                  onRemove={() => partners.remove(index)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
