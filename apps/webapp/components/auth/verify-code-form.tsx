'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@workspace/ui/components/input';
import { cn } from '@workspace/ui/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { Button } from '@workspace/ui/components/button';

const verifyCodeSchema = z.object({
  code: z
    .string()
    .min(1, { message: 'O código é obrigatório' })
    .length(6, { message: 'O código deve ter 6 dígitos' })
    .regex(/^\d+$/, { message: 'O código deve conter apenas números' }),
});

type VerifyCodeFormValues = z.infer<typeof verifyCodeSchema>;

interface VerifyCodeFormProps {
  email: string;
  onSubmitVerification: (code: string) => Promise<{ status: number; [key: string]: unknown }>;
  onBackToEmail: () => void;
  className?: string;
}

export const VerifyCodeForm = ({ email, onSubmitVerification, onBackToEmail, className }: VerifyCodeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VerifyCodeFormValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  const handleSubmit = async (values: VerifyCodeFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await onSubmitVerification(values.code);

      if (response.status === 200 || response.status === 201) {
        toast.success('Login realizado com sucesso!');
        return;
      }

      if (response.status === 429) {
        toast.error('Muitas tentativas. Solicite um novo código.');
        form.setError('code', { message: 'Solicite um novo código' });
        return;
      }

      if (response.status === 401) {
        toast.error('Código inválido ou expirado. Tente novamente.');
        form.setError('code', { message: 'Código inválido ou expirado' });
        return;
      }

      toast.error('Não foi possível verificar o código. Tente novamente.');
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      toast.error('Ops! Ocorreu um erro ao verificar o código.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Enviamos um código de verificação de 6 dígitos para <strong>{email}</strong>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="code">Código de verificação</FormLabel>
                <FormControl>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    placeholder="000000"
                    autoComplete="one-time-code"
                    {...field}
                    disabled={isSubmitting}
                    className="text-center text-2xl tracking-widest"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton className="w-full bg-primary" isSubmitting={isSubmitting}>
            Verificar código
          </SubmitButton>

          <div className="text-center">
            <Button type="button" variant="link" className="text-sm text-muted-foreground" onClick={onBackToEmail} disabled={isSubmitting}>
              Não recebeu o código? Clique aqui para reenviar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default VerifyCodeForm;
