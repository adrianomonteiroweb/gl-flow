'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { SubmitButton } from '@workspace/ui/components/submit-button';
import { resetPassword } from '@/actions/auth';
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/password-rules';

const schema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH, { message: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres` }),
    confirm_password: z.string().min(1, { message: 'Confirme sua senha' }),
  })
  .superRefine(({ password, confirm_password }, ctx) => {
    if (password !== confirm_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'As senhas não coincidem',
        path: ['confirm_password'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface ResetPasswordFormProps {
  uid: string;
  token: string;
}

export function ResetPasswordForm({ uid, token }: ResetPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm_password: '' },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      const response = await resetPassword(uid, token, values.password);

      if (response.status === 200) {
        toast.success('Senha redefinida com sucesso!');
        router.push('/login');
        return;
      }

      if (response.invalid_token) {
        setInvalidToken(true);
        return;
      }

      if (response.status === 400 && typeof response.message === 'string') {
        form.setError('password', { message: response.message });
        return;
      }

      toast.error('Não foi possível redefinir a senha. Tente novamente.');
    } catch {
      toast.error('Ops! Ocorreu um erro ao redefinir sua senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (invalidToken) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <p className="text-sm text-muted-foreground">Este link de redefinição é inválido ou expirou.</p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline underline-offset-4">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="password">Nova senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      autoFocus
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
                <p className="text-xs text-muted-foreground">Mínimo {PASSWORD_MIN_LENGTH} caracteres</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="confirm_password">Confirmar senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      className="pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirm(v => !v)}
                      aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                      aria-pressed={showConfirm}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SubmitButton className="bg-primary" isSubmitting={isSubmitting}>
            Redefinir senha
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}

export default ResetPasswordForm;
