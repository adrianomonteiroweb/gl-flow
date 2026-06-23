'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { SparklesIcon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { seedDefaultProposalTemplates } from '@/actions/proposal-templates';

export const SeedDefaultTemplateButton = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSeed = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await seedDefaultProposalTemplates();

      if (!result.success) {
        toast.error(result.error ?? 'Erro ao adicionar modelo padrão.');
        return;
      }

      toast.success('Modelo padrão adicionado com sucesso.');
      document.dispatchEvent(new Event('proposal-templates:updated'));
    } catch (error) {
      console.error(error);
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button type="button" variant="ghost" onClick={handleSeed} disabled={isSubmitting}>
      <SparklesIcon className="mr-1 h-4 w-4" />
      {isSubmitting ? 'Aguarde...' : 'Adicionar modelo padrão'}
    </Button>
  );
};
