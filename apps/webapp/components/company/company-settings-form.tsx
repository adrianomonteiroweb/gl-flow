'use client';

import SubmitButton from '@workspace/ui/components/submit-button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card';
import { Separator } from '@workspace/ui/components/separator';
import type { CompanyProfile } from '@/lib/company/profile';

import { useCompanyProfileForm } from './use-company-profile-form';
import { CnpjLookupInput, CompanyIdentityFields, CompanyAddressFields, CompanyManualFields } from './company-fields';
import { CompanyBrandFields } from './company-brand-fields';

export const CompanySettingsForm = ({ initial }: { initial: Partial<CompanyProfile> | null }) => {
  const form = useCompanyProfileForm(initial);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da Prestadora</CardTitle>
          <CardDescription>Essas informações preenchem a proposta padrão e o termo de adesão.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <CnpjLookupInput
            value={form.company.cnpj}
            onChange={form.setCnpj}
            onLookup={form.lookup}
            isLoading={form.isCnpjLoading}
            conflict={form.cnpjConflict}
            onGoToLogin={form.goToLogin}
          />

          <Separator />

          <CompanyBrandFields company={form.company} setField={form.setField} />

          <Separator />

          <CompanyIdentityFields company={form.company} setField={form.setField} />
          <CompanyAddressFields company={form.company} setField={form.setField} />

          <Separator />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Informações complementares</p>
          </div>
          <CompanyManualFields company={form.company} setField={form.setField} />

          <div className="flex justify-end">
            <SubmitButton isSubmitting={form.isSaving} onClick={form.save}>
              Salvar
            </SubmitButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettingsForm;
