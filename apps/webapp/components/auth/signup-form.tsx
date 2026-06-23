'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import { PasswordInput } from '@workspace/ui/components/password-input';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { Button } from '@workspace/ui/components/button';
import { passwordStrengthSchema } from '@/lib/auth/password-rules';

import { PasswordStrengthIndicator } from './password-strength-indicator';

const signupSchema = z
  .object({
    name: z.string().min(1, { message: 'O nome é obrigatório' }),
    email: z.string().min(1, { message: 'O e-mail é obrigatório' }).email({ message: 'Formato de e-mail inválido' }),
    password: passwordStrengthSchema,
    confirmPassword: z.string().min(1, { message: 'A confirmação de senha é obrigatória' }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

type Props = {
  onSubmitSignUp: (name: string, email: string, password: string) => Promise<{ status: number; [key: string]: unknown }>;
  onBackToSignIn: () => void;
  className?: string;
};

export const SignUpForm = ({ onSubmitSignUp, onBackToSignIn, className }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const handleSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await onSubmitSignUp(values.name, values.email, values.password);

      if (response.status === 200 || response.status === 201) {
        toast.success('Conta criada com sucesso!');
        return;
      }

      if (response.status === 400 && response.code === 'email_already_exists') {
        form.setError('email', { message: 'Este e-mail já está cadastrado.' });
        return;
      }

      if (response.status === 400 && response.code === 'weak_password') {
        form.setError('password', { message: (response.message as string) || 'Senha muito fraca.' });
        return;
      }

      toast.error('Erro ao criar conta. Tente novamente.');
    } catch (error: unknown) {
      console.error(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Ops! Ocorreu um erro ao processar suas informações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordValue = form.watch('password');
  const confirmPasswordValue = form.watch('confirmPassword');
  const showConfirmHint = confirmPasswordValue.length > 0;
  const passwordsMatch = passwordValue === confirmPasswordValue;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className={cn('flex flex-col gap-4', className)}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="signup-name">Nome</FormLabel>
                <FormControl>
                  <Input id="signup-name" placeholder="Seu nome completo" autoFocus autoComplete="name" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="signup-email">E-mail</FormLabel>
                <FormControl>
                  <Input id="signup-email" type="email" placeholder="email@exemplo.com" autoComplete="email" disabled={isSubmitting} {...field} />
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
                <FormLabel htmlFor="signup-password">Senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    id="signup-password"
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <PasswordStrengthIndicator password={passwordValue} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="signup-confirm">Confirmar senha</FormLabel>
                <FormControl>
                  <PasswordInput id="signup-confirm" autoComplete="new-password" placeholder="Repita a senha" disabled={isSubmitting} {...field} />
                </FormControl>
                {showConfirmHint && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {passwordsMatch ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-muted-foreground">Senhas coincidem</span>
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-destructive">As senhas não coincidem</span>
                      </>
                    )}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton className="bg-primary" isSubmitting={isSubmitting}>
            Criar conta
          </SubmitButton>

          <div className="text-center">
            <Button type="button" variant="link" className="text-sm text-muted-foreground" onClick={onBackToSignIn}>
              Já tem uma conta? Entrar
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};
