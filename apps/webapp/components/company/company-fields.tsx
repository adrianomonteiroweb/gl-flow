'use client';

import { Loader2, LogIn, Search, TriangleAlert } from 'lucide-react';

import { Label } from '@workspace/ui/components/label';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';
import type { CompanyProfile } from '@/lib/company/profile';

type CompanyField = keyof CompanyProfile;
type FieldSetter = <K extends CompanyField>(field: K, value: CompanyProfile[K]) => void;

const CompanyTextField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export const CnpjLookupInput = ({
  value,
  onChange,
  onLookup,
  isLoading,
  autoFocus,
  conflict,
  onGoToLogin,
}: {
  value: string;
  onChange: (value: string) => void;
  onLookup: () => void;
  isLoading: boolean;
  autoFocus?: boolean;
  conflict?: boolean;
  onGoToLogin?: () => void;
}) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor="cnpj-input">CNPJ *</Label>
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          id="cnpj-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
          autoFocus={autoFocus}
        />
        {isLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <Button type="button" variant="outline" onClick={onLookup} disabled={isLoading}>
        <Search className="h-4 w-4 mr-1" />
        Buscar
      </Button>
    </div>

    {conflict ? (
      <Alert variant="destructive" className="mt-1">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Empresa já cadastrada</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <p>Já existe uma conta associada a este CNPJ. Se você faz parte dessa empresa, solicite um convite ao administrador.</p>
          <Button variant="outline" size="sm" className="w-fit" onClick={onGoToLogin}>
            <LogIn className="mr-1.5 h-3.5 w-3.5" />
            Ir para o login
          </Button>
        </AlertDescription>
      </Alert>
    ) : (
      <p className="text-xs text-muted-foreground">Preenchemos os dados automaticamente.</p>
    )}
  </div>
);

export const CompanyIdentityFields = ({ company, setField }: { company: CompanyProfile; setField: FieldSetter }) => (
  <div className="grid gap-4">
    <CompanyTextField
      id="razaoSocial-input"
      label="Razão social"
      value={company.razaoSocial}
      onChange={v => setField('razaoSocial', v)}
      placeholder="Nome empresarial"
    />
    <CompanyTextField
      id="nomeFantasia-input"
      label="Nome fantasia"
      value={company.nomeFantasia}
      onChange={v => setField('nomeFantasia', v)}
      placeholder="Nome fantasia"
    />
    <CompanyTextField
      id="telefone-input"
      label="Telefone"
      value={company.telefone}
      onChange={v => setField('telefone', v)}
      placeholder="(00) 0000-0000"
    />
  </div>
);

export const CompanyAddressFields = ({ company, setField }: { company: CompanyProfile; setField: FieldSetter }) => (
  <div className="grid gap-4">
    <CompanyTextField
      id="endereco-input"
      label="Endereço"
      value={company.endereco}
      onChange={v => setField('endereco', v)}
      placeholder="Avenida, rua, número e complemento"
    />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CompanyTextField id="bairro-input" label="Bairro" value={company.bairro} onChange={v => setField('bairro', v)} placeholder="Bairro" />
      <CompanyTextField
        id="cidadeUf-input"
        label="Cidade/UF"
        value={company.cidadeUf}
        onChange={v => setField('cidadeUf', v)}
        placeholder="Cidade/UF"
      />
    </div>
    <CompanyTextField id="cep-input" label="CEP" value={company.cep} onChange={v => setField('cep', v)} placeholder="00000-000" />
  </div>
);

export const CompanyManualFields = ({ company, setField }: { company: CompanyProfile; setField: FieldSetter }) => (
  <div className="grid gap-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CompanyTextField
        id="inscricaoEstadual-input"
        label="Inscrição estadual"
        value={company.inscricaoEstadual}
        onChange={v => setField('inscricaoEstadual', v)}
        placeholder="000.000.000"
      />
      <CompanyTextField
        id="atoAnatel-input"
        label="Ato de autorização — Anatel"
        value={company.atoAutorizacaoAnatel}
        onChange={v => setField('atoAutorizacaoAnatel', v)}
        placeholder="Nº 0000 de 00/00/0000"
      />
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CompanyTextField id="site-input" label="Site" value={company.site} onChange={v => setField('site', v)} placeholder="www.empresa.com.br" />
      <CompanyTextField
        id="email-input"
        label="E-mail"
        type="email"
        value={company.email}
        onChange={v => setField('email', v)}
        placeholder="contato@empresa.com.br"
      />
    </div>
  </div>
);
