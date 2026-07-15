'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { SubmitButton } from '@workspace/ui/components/submit-button';

const LOCKOUT_MINUTES = 15;

const loginSchema = z.object({
  email: z.string().min(1, { message: 'O e-mail é obrigatório' }).email({ message: 'Formato de e-mail inválido' }),
  password: z.string().min(1, { message: 'A senha é obrigatória' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface PasswordFormProps {
  onSubmit: (email: string, password: string) => Promise<{ status: number; [key: string]: unknown }>;
  className?: string;
}

export function PasswordForm({ onSubmit, className }: PasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await onSubmit(values.email, values.password);

      if (response.status === 200 || response.status === 201) {
        return;
      }

      if (response.status === 429) {
        const minutes = typeof response.minutes_remaining === 'number' ? response.minutes_remaining : LOCKOUT_MINUTES;
        toast.error(`Conta temporariamente bloqueada. Tente novamente em ${minutes} minuto${minutes !== 1 ? 's' : ''}.`);
        return;
      }

      if (response.no_password) {
        toast.error('Você ainda não possui senha. Use "Esqueceu sua senha?" para criar a sua.');
        return;
      }

      if (response.status === 401) {
        form.setError('password', { message: 'E-mail ou senha incorretos' });
        return;
      }

      toast.error('Não foi possível realizar o login. Tente novamente.');
    } catch {
      toast.error('Ops! Ocorreu um erro ao processar suas informações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className={cn('flex flex-col gap-6', className)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="email">E-mail</FormLabel>
                <FormControl>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    autoFocus
                    autoComplete="email"
                    disabled={isSubmitting}
                    {...field}
                  />
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
                <div className="flex items-center justify-between">
                  <FormLabel htmlFor="password">Senha</FormLabel>
                  <Link
                    href="/forgot-password"
                    tabIndex={-1}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      className="pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showPassword}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
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

export default PasswordForm;
