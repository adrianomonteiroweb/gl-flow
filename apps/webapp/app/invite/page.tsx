'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { Label } from '@workspace/ui/components/label';
import { PasswordInput } from '@workspace/ui/components/password-input';
import { acceptInvite } from '@/actions/team';
import { createSession } from '@/actions/auth';
import { validatePasswordSync } from '@/lib/auth/password-rules';
import { PasswordStrengthIndicator } from '@/components/auth/password-strength-indicator';

const InviteForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();

    if (!token) {
      toast.error('Convite inválido.');
      return;
    }

    const passwordCheck = validatePasswordSync(password);

    if (!passwordCheck.valid) {
      toast.error(passwordCheck.errors[0] ?? 'Senha muito fraca.');
      return;
    }

    if (password !== confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);

    const result = await acceptInvite(token, password);

    if (!result.success) {
      setIsSubmitting(false);
      toast.error(result.error);
      return;
    }

    const session = await createSession(result.email, password);

    setIsSubmitting(false);

    if (session.status === 200 || session.status === 201) {
      toast.success('Conta ativada! Bem-vindo(a).');
      router.replace('/leads');
      return;
    }

    toast.success('Conta ativada! Faça login para continuar.');
    router.replace('/login');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Ativar sua conta</h1>
        <p className="text-sm text-muted-foreground">Crie uma senha para acessar a plataforma.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-password">Senha</Label>
        <PasswordInput
          id="invite-password"
          value={password}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          onChange={e => setPassword(e.target.value)}
        />
        <PasswordStrengthIndicator password={password} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-confirm">Confirmar senha</Label>
        <PasswordInput
          id="invite-confirm"
          value={confirm}
          autoComplete="new-password"
          placeholder="Repita a senha"
          onChange={e => setConfirm(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Ativando...' : 'Ativar conta'}
      </Button>
    </form>
  );
};

export default function InvitePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
      <Card className="p-6">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
          <InviteForm />
        </Suspense>
      </Card>
    </div>
  );
}
