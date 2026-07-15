import { redirect } from 'next/navigation';

import { LinharesLogo } from '@workspace/ui/components/logos/linhares';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

type Props = {
  searchParams: Promise<{ uid?: string; token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { uid, token } = await searchParams;

  if (!uid || !token) {
    redirect('/forgot-password');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8 space-y-8">
        <div className="flex justify-center">
          <LinharesLogo height={34} className="text-foreground" />
        </div>

        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground">Crie uma nova senha para a sua conta</p>
        </div>

        <ResetPasswordForm uid={uid} token={token} />
      </div>
    </div>
  );
}
