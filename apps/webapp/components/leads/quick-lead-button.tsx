'use client';

import { Button } from '@workspace/ui/components/button';

// Dispara o modal global de Cadastro Rápido (montado em providers.tsx),
// que já ouve o evento `quick-lead:open`.
export const QuickLeadButton = ({ label = 'Novo Lead' }: { label?: string }) => {
  const handleClick = () => {
    document.dispatchEvent(new Event('quick-lead:open'));
  };

  return <Button onClick={handleClick}>{label}</Button>;
};
