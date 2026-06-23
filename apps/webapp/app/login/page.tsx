'use client';

import { SignIn } from '@/components/auth/signin';
import { useSessionContext } from '@/contexts/session';

export default function LoginPage() {
  const { handleAuthentication } = useSessionContext();
  return <SignIn handleAuthentication={handleAuthentication} />;
}
