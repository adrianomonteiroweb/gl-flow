'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { formatCnpj, onlyNumbers } from '@workspace/utils/text';
import { destroySession } from '@/actions/auth';
import { lookupCompanyByCnpj, saveCompanyProfile } from '@/actions/company';
import { EMPTY_COMPANY, toCompanyProfile, type CompanyProfile } from '@/lib/company/profile';
import type { BrasilApiCompany } from '@/lib/brasilapi';
import { useSessionContext } from '@/contexts/session';

type CompanyField = keyof CompanyProfile;

/** Fills only the fields the operator left empty, so manual edits are never overwritten. */
const mergeFromLookup = (prev: CompanyProfile, result: BrasilApiCompany): CompanyProfile => ({
  ...prev,
  cnpj: prev.cnpj || result.cnpj,
  razaoSocial: prev.razaoSocial || result.razaoSocial,
  nomeFantasia: prev.nomeFantasia || result.nomeFantasia,
  telefone: prev.telefone || result.telefone,
  endereco: prev.endereco || result.endereco,
  bairro: prev.bairro || result.bairro,
  cidadeUf: prev.cidadeUf || result.cidadeUf,
  cep: prev.cep || result.cep,
  email: prev.email || result.email,
});

export const useCompanyProfileForm = (initial?: Partial<CompanyProfile> | null) => {
  const router = useRouter();
  const { updateCompanyProfile } = useSessionContext();
  const [company, setCompany] = useState<CompanyProfile>(() => toCompanyProfile(initial ?? EMPTY_COMPANY));
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cnpjConflict, setCnpjConflict] = useState(false);
  // Seed with the already-saved CNPJ so an already-configured company does not
  // auto-trigger the registration availability lookup on mount (e.g. /company
  // after onboarding). Only a CNPJ the operator actually changes is looked up.
  const lastFetchedCnpjRef = useRef<string>(onlyNumbers(initial?.cnpj ?? ''));
  const [lookupDoneCount, setLookupDoneCount] = useState(0);

  const setField = <K extends CompanyField>(field: K, value: CompanyProfile[K]): void => {
    setCompany(prev => ({ ...prev, [field]: value }));
  };

  const setCnpj = (value: string): void => {
    setField('cnpj', formatCnpj(onlyNumbers(value).slice(0, 14)));
  };

  const performLookup = async (digits: string, shouldContinue: () => boolean): Promise<void> => {
    setIsCnpjLoading(true);
    setCnpjConflict(false);

    try {
      const result = await lookupCompanyByCnpj(digits);

      if (!shouldContinue()) {
        return;
      }

      if (!result.available) {
        setCnpjConflict(true);
        toast.error('Já existe uma conta cadastrada para este CNPJ.');
        return;
      }

      if (!result.company) {
        toast.error('CNPJ não encontrado.');
        return;
      }

      lastFetchedCnpjRef.current = digits;
      setCompany(prev => mergeFromLookup(prev, result.company!));
      setLookupDoneCount(prev => prev + 1);
      toast.success('Dados encontrados.');
    } finally {
      if (shouldContinue()) {
        setIsCnpjLoading(false);
      }
    }
  };

  // Auto-lookup as soon as a full CNPJ is typed (mirrors the CEP lookup UX).
  useEffect(() => {
    const digits = onlyNumbers(company.cnpj);

    if (digits.length !== 14 || digits === lastFetchedCnpjRef.current) {
      return;
    }

    let active = true;
    performLookup(digits, () => active);

    return () => {
      active = false;
    };
  }, [company.cnpj]);

  // Explicit "Buscar" button: re-fetches even if the same CNPJ was already looked up.
  const lookup = (): void => {
    const digits = onlyNumbers(company.cnpj);

    if (digits.length !== 14) {
      toast.error('Informe um CNPJ com 14 dígitos.');
      return;
    }

    lastFetchedCnpjRef.current = '';
    performLookup(digits, () => true);
  };

  const save = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const result = await saveCompanyProfile(company);

      if (!result.success) {
        toast.error(result.error ?? 'Erro ao salvar dados da empresa.');
        return false;
      }

      toast.success('Dados da empresa salvos.');
      updateCompanyProfile(company);
      return true;
    } catch (error) {
      console.error(error);
      toast.error('Ops! Ocorreu um erro ao salvar.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveDraft = (): void => {
    saveCompanyProfile(company).catch(() => {});
  };

  const goToLogin = useCallback(async () => {
    await destroySession();
    router.replace('/login');
  }, [router]);

  return { company, setField, setCnpj, lookup, isCnpjLoading, cnpjConflict, goToLogin, save, isSaving, saveDraft, lookupDoneCount };
};
