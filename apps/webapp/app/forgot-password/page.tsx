import { LinharesLogo } from '@workspace/ui/components/logos/linhares';

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8 space-y-8">
        <div className="flex justify-center">
          <LinharesLogo height={34} className="text-foreground" />
        </div>

        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">Informe seu e-mail para receber as instruções de redefinição</p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
