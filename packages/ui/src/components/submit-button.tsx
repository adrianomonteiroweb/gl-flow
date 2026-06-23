'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@workspace/ui/components/button';

export function SubmitButton({ children, isSubmitting = false, pendingLabel = 'Aguarde...', ...rest }: any) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || isSubmitting} {...rest}>
      {pending || isSubmitting ? pendingLabel : children}
    </Button>
  );
}

export default SubmitButton;
