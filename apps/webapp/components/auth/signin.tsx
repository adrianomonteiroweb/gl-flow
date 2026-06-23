'use client';

import { useState } from 'react';

import { SignInForm } from '@/components/auth/signin-form';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { SignUpForm } from '@/components/auth/signup-form';
import { requestPasswordReset, signUpUser } from '@/actions/auth';

type AuthView = 'signin' | 'signup' | 'forgot-password';

export function SignIn({
  handleAuthentication,
}: {
  handleAuthentication: (email: string, password: string) => Promise<{ status: number; [key: string]: unknown }>;
}) {
  const [currentView, setCurrentView] = useState<AuthView>('signin');

  const handleForgotPassword = async (email: string) => {
    const result = await requestPasswordReset(email);
    return result;
  };

  const handleSignUp = async (name: string, email: string, password: string) => {
    const result = await signUpUser({ name, email, password });

    if (result.status === 200 || result.status === 201) {
      window.location.href = '/';
    }

    return result;
  };

  const getTitle = () => {
    switch (currentView) {
      case 'signin':
        return 'Área Restrita';
      case 'signup':
        return 'Criar conta';
      case 'forgot-password':
        return 'Recuperar senha';
      default:
        return 'Entrar';
    }
  };

  const getDescription = () => {
    switch (currentView) {
      case 'signin':
        return 'Entre com suas credenciais para acessar sua conta';
      case 'signup':
        return 'Crie sua conta para começar';
      case 'forgot-password':
        return 'Digite seu e-mail para recuperar sua senha';
      default:
        return 'Acesse sua conta';
    }
  };

  const renderForm = () => {
    switch (currentView) {
      case 'signin':
        return <SignInForm onSubmitAuth={handleAuthentication} onForgotPassword={() => setCurrentView('forgot-password')} />;
      case 'signup':
        return <SignUpForm onSubmitSignUp={handleSignUp} onBackToSignIn={() => setCurrentView('signin')} />;
      case 'forgot-password':
        return <ForgotPasswordForm onSubmitForgotPassword={handleForgotPassword} onBackToSignIn={() => setCurrentView('signin')} />;
      default:
        return <SignInForm onSubmitAuth={handleAuthentication} onForgotPassword={() => setCurrentView('forgot-password')} />;
    }
  };

  const renderToggleButton = () => {
    if (currentView === 'signin') {
      return (
        <div className="text-center">
          <button type="button" className="text-sm text-muted-foreground hover:underline underline-offset-2" onClick={() => setCurrentView('signup')}>
            Não tem uma conta? Criar conta
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-md p-6 sm:p-8 bg-background rounded-xl shadow-lg border space-y-6">
        {currentView !== 'signup' && (
          <div className="flex justify-center mb-8">
            <span className="text-2xl font-bold text-foreground">linharesflow</span>
          </div>
        )}

        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{getTitle()}</h1>
          <p className="text-sm text-muted-foreground">{getDescription()}</p>
        </div>

        {renderForm()}
        {renderToggleButton()}
      </div>
    </div>
  );
}
