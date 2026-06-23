'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import { Input } from '@workspace/ui/components/input';
import { cn } from '@workspace/ui/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { Button } from '@workspace/ui/components/button';
import { toast } from 'sonner';

// Define Zod validation schema
const forgotPasswordSchema = z.object({
  email: z.string().min(1, { message: 'O e-mail é obrigatório' }).email({ message: 'Formato de e-mail inválido' }),
});

// Type inference from schema
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Define proper types for props
interface ForgotPasswordProps {
  onSubmitForgotPassword: (email: string) => Promise<{ status: number; [key: string]: unknown }>;
  onBackToSignIn: () => void;
  className?: string;
  [key: string]: unknown;
}

export function ForgotPasswordForm({ onSubmitForgotPassword, onBackToSignIn, className, ...props }: ForgotPasswordProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with react-hook-form and zod resolver
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Form submission handler
  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await onSubmitForgotPassword(values.email);

      if (response.status === 200) {
        toast.success('Enviamos um link de recuperação para seu e-mail. Verifique sua caixa de entrada.');
        form.reset();
      } else if (response.status === 404) {
        toast.warning('E-mail não encontrado em nossa base de dados.');
      } else {
        toast.error('Ops! Ocorreu um erro ao processar sua solicitação.');
      }
    } catch (error: unknown) {
      console.error(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Ops! Ocorreu um erro ao processar sua solicitação.');
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
            Enviar link de recuperação
          </SubmitButton>

          <Button type="button" variant="link" className="flex items-center gap-2 text-sm text-muted-foreground" onClick={onBackToSignIn}>
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default ForgotPasswordForm;
