'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@workspace/ui/lib/utils';
import { PasswordInput } from '@workspace/ui/components/password-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { passwordStrengthSchema } from '@/lib/auth/password-rules';

import { PasswordStrengthIndicator } from './password-strength-indicator';

const resetPasswordSchema = z
  .object({
    password: passwordStrengthSchema,
    confirmPassword: z.string().min(1, { message: 'A confirmação de senha é obrigatória' }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordProps {
  onSubmitResetPassword: (password: string, token: string) => Promise<{ status: number; [key: string]: unknown }>;
  token: string;
  className?: string;
  [key: string]: unknown;
}

export function ResetPasswordForm({ onSubmitResetPassword, token, className, ...props }: ResetPasswordProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await onSubmitResetPassword(values.password, token);

      if (response.status === 200) {
        toast.success('Senha redefinida com sucesso! Você já pode fazer login novamente.');
        router.push('/');
      } else if (response.status === 400) {
        toast.warning('Token inválido ou expirado. Solicite uma nova recuperação de senha.');
      } else {
        toast.error('Ops! Ocorreu um erro ao redefinir sua senha.');
      }
    } catch (error: unknown) {
      console.error(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Ops! Ocorreu um erro ao redefinir sua senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className={cn('flex flex-col gap-6', className)} {...props}>
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Redefinir senha</h1>
            <p className="text-sm text-muted-foreground">Digite sua nova senha</p>
          </div>

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="password">Nova senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    disabled={isSubmitting}
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <PasswordStrengthIndicator password={field.value} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="confirmPassword">Confirme a nova senha</FormLabel>
                <FormControl>
                  <PasswordInput id="confirmPassword" autoComplete="new-password" placeholder="Repita a senha" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton className="bg-primary" isSubmitting={isSubmitting}>
            Redefinir senha
          </SubmitButton>

          <div className="text-center">
            <Link href="/" className="text-sm text-muted-foreground">
              Ir para o login
            </Link>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default ResetPasswordForm;
