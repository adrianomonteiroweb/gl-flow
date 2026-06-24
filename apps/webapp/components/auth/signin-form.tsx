'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@workspace/ui/components/input';
import { cn } from '@workspace/ui/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { SubmitButton } from '@workspace/ui/components/submit-button';

const signinSchema = z.object({
  email: z.string().min(1, { message: 'O e-mail é obrigatório' }).email({ message: 'Formato de e-mail inválido' }),
});

type SigninFormValues = z.infer<typeof signinSchema>;

interface SigninProps {
  onSubmitEmail: (email: string) => Promise<{ status: number; [key: string]: unknown }>;
  className?: string;
  [key: string]: unknown;
}

export function SignInForm({ onSubmitEmail, className, ...props }: SigninProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleSubmit = async (values: SigninFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await onSubmitEmail(values.email);

      if (response.status === 200 || response.status === 201) {
        return;
      }

      toast.error('Não foi possível enviar o código. Tente novamente.');
    } catch (error: unknown) {
      console.error(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Ops! Ocorreu um erro ao processar suas informações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className={cn('flex flex-col gap-6', className)} {...props}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="email">E-mail</FormLabel>
                <FormControl>
                  <Input id="email" type="email" placeholder="email@exemplo.com" autoFocus autoComplete="email" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton className="bg-primary" isSubmitting={isSubmitting}>
            Enviar código
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}

export default SignInForm;
