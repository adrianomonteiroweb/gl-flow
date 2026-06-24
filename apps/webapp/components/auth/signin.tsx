'use client';

import { useState } from 'react';

import { LinharesLogo } from '@workspace/ui/components/logos/linhares';

import { SignInForm } from '@/components/auth/signin-form';
import { VerifyCodeForm } from '@/components/auth/verify-code-form';
import { requestLoginCode } from '@/actions/auth';

type AuthStep = 'email' | 'code';

export function SignIn({
  handleAuthentication,
}: {
  handleAuthentication: (email: string, code: string) => Promise<{ status: number; [key: string]: unknown }>;
}) {
  const [step, setStep] = useState<AuthStep>('email');
  const [pendingEmail, setPendingEmail] = useState<string>('');

  const handleRequestCode = async (email: string) => {
    const result = await requestLoginCode(email);

    if (result.status === 200 || result.status === 201) {
      setPendingEmail(email);
      setStep('code');
    }

    return result;
  };

  const getTitle = () => {
    if (step === 'code') {
      return 'Verificar código';
    }

    return 'Área Restrita';
  };

  const getDescription = () => {
    if (step === 'code') {
      return 'Digite o código enviado para o seu e-mail';
    }

    return 'Informe seu e-mail para receber o código de acesso';
  };

  const renderForm = () => {
    if (step === 'code') {
      return (
        <VerifyCodeForm
          email={pendingEmail}
          onSubmitVerification={code => handleAuthentication(pendingEmail, code)}
          onBackToEmail={() => setStep('email')}
        />
      );
    }

    return <SignInForm onSubmitEmail={handleRequestCode} />;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8 space-y-8">
        <div className="flex justify-center">
          <LinharesLogo height={34} className="text-foreground" />
        </div>

        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{getTitle()}</h1>
          <p className="text-sm text-muted-foreground">{getDescription()}</p>
        </div>

        {renderForm()}
      </div>
    </div>
  );
}
