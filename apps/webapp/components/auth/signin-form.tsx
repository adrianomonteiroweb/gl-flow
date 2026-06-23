'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@workspace/ui/components/input';
import { PasswordInput } from '@workspace/ui/components/password-input';
import { cn } from '@workspace/ui/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { Button } from '@workspace/ui/components/button';

const signinSchema = z.object({
  email: z.string().min(1, { message: 'O e-mail é obrigatório' }).email({ message: 'Formato de e-mail inválido' }),
  password: z.string().min(1, { message: 'A senha é obrigatória' }),
});

type SigninFormValues = z.infer<typeof signinSchema>;

interface SigninProps {
  onSubmitAuth: (email: string, password: string) => Promise<{ status: number; [key: string]: unknown }>;
  onForgotPassword: () => void;
  className?: string;
  [key: string]: unknown;
}

export function SignInForm({ onSubmitAuth, onForgotPassword, className, ...props }: SigninProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmit = async (values: SigninFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await onSubmitAuth(values.email, values.password);

      if (response.status === 401) {
        toast.error('Usuário ou senha inválidos.');
        setIsSubmitting(false);
        return;
      }

      if (response.status === 200 || response.status === 201) {
        toast.success('Login realizado com sucesso!');
        return;
      }

      toast.error('Erro ao fazer login. Tente novamente.');
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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <div className="flex items-center">
                  <FormLabel htmlFor="password">Senha</FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    className="ml-auto text-sm underline-offset-2 hover:underline text-muted-foreground"
                    onClick={onForgotPassword}>
                    Esqueceu sua senha?
                  </Button>
                </div>
                <FormControl>
                  <PasswordInput id="password" autoComplete="current-password" placeholder="Digite sua senha" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton className="bg-primary" isSubmitting={isSubmitting}>
            Entrar
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}

export default SignInForm;
