'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Headphones, LogIn, Shield, Users, X } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import SubmitButton from '@workspace/ui/components/submit-button';
import { Input } from '@workspace/ui/components/input';
import { Badge } from '@workspace/ui/components/badge';

import type { Role } from '@/lib/auth/permissions';
import { inviteTeamMembers } from '@/actions/team';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OnboardingRole = Extract<Role, 'admin' | 'member'>;

type RoleConfig = {
  role: OnboardingRole;
  title: string;
  description: string;
  icon: typeof Shield;
};

const ROLES: RoleConfig[] = [
  { role: 'admin', title: 'Administradores', description: 'Acesso total: configurações, relatórios e gestão do time', icon: Shield },
  { role: 'member', title: 'Membros', description: 'Atendem leads, enviam mensagens e fazem follow-up', icon: Headphones },
];

type Props = {
  onDone: (status: 'done' | 'skipped') => void | Promise<void>;
  onBack?: () => void;
  onCancel?: () => void;
};

type EmailRoleSectionProps = {
  config: RoleConfig;
  emails: string[];
  allEmails: Set<string>;
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
  disabled: boolean;
};

const EmailRoleSection = ({ config, emails, allEmails, onAdd, onRemove, disabled }: EmailRoleSectionProps) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = (raw: string): void => {
    const email = raw.trim().toLowerCase();
    if (!email) {
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      toast.error(`"${email}" não é um e-mail válido.`);
      return;
    }

    if (allEmails.has(email)) {
      toast.error(`"${email}" já foi adicionado.`);
      return;
    }

    onAdd(email);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(input);
    }
    if (e.key === 'Backspace' && !input && emails.length > 0) {
      onRemove(emails[emails.length - 1]!);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    const text = e.clipboardData.getData('text');
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    if (parts.length > 1) {
      e.preventDefault();
      for (const part of parts) {
        addEmail(part);
      }
    }
  };

  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{config.title}</span>
        {emails.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {emails.length}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{config.description}</p>

      <div
        className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 cursor-text focus-within:ring-1 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}>
        {emails.map(email => (
          <Badge key={email} variant="secondary" className="gap-1 pr-1">
            {email}
            <button type="button" onClick={() => onRemove(email)} className="rounded-full p-0.5 hover:bg-muted" disabled={disabled}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          type="email"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (input.trim()) {
              addEmail(input);
            }
          }}
          placeholder={emails.length === 0 ? 'nome@empresa.com' : ''}
          className="h-7 min-w-[140px] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
          disabled={disabled}
        />
      </div>
      {emails.length === 0 && <p className="text-xs text-muted-foreground">Digite o e-mail e pressione Enter para adicionar.</p>}
    </div>
  );
};

type EmailsByRole = Record<OnboardingRole, string[]>;

export const TeamOnboardingStep = ({ onDone, onBack, onCancel }: Props) => {
  const [emailsByRole, setEmailsByRole] = useState<EmailsByRole>({ admin: [], member: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const allEmails = new Set([...emailsByRole.admin, ...emailsByRole.member]);
  const totalCount = allEmails.size;
  const busy = isSaving || isSkipping;

  const addEmail = (role: OnboardingRole, email: string): void => {
    setEmailsByRole(prev => ({ ...prev, [role]: [...prev[role], email] }));
  };

  const removeEmail = (role: OnboardingRole, email: string): void => {
    setEmailsByRole(prev => ({ ...prev, [role]: prev[role].filter(e => e !== email) }));
  };

  const handleInvite = async (): Promise<void> => {
    setIsSaving(true);

    let totalInvited = 0;
    const allSkipped: string[] = [];

    for (const { role } of ROLES) {
      const emails = emailsByRole[role];
      if (emails.length === 0) {
        continue;
      }

      const result = await inviteTeamMembers(emails, role);

      if (!result.success) {
        toast.error(result.error ?? 'Não foi possível enviar os convites.');
        setIsSaving(false);
        return;
      }

      totalInvited += result.invited;
      allSkipped.push(...result.skipped);
    }

    if (totalInvited > 0) {
      toast.success(`${totalInvited} convite(s) enviado(s).`);
    }

    if (allSkipped.length > 0) {
      toast.warning(`${allSkipped.length} e-mail(s) já cadastrado(s) foram ignorados.`);
    }

    setIsSaving(false);
    await onDone('done');
  };

  const handleSkip = async (): Promise<void> => {
    setIsSkipping(true);
    await onDone('skipped');
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Convide seu time</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Adicione os e-mails de quem vai usar o sistema. Cada pessoa recebe um convite para criar a senha.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {ROLES.map(config => (
          <EmailRoleSection
            key={config.role}
            config={config}
            emails={emailsByRole[config.role]}
            allEmails={allEmails}
            onAdd={email => addEmail(config.role, email)}
            onRemove={email => removeEmail(config.role, email)}
            disabled={busy}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onCancel} disabled={busy}>
              <LogIn className="h-4 w-4" />
              Voltar ao login
            </Button>
          )}
          {onBack && (
            <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={busy}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
        </div>
        <div className="hidden flex-1 sm:block" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={busy}
            className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 sm:w-auto">
            Configurar depois
          </Button>
          <SubmitButton isSubmitting={isSaving} onClick={handleInvite} disabled={totalCount === 0 || busy} className="w-full sm:w-auto">
            {totalCount > 1 ? `Enviar ${totalCount} convites` : totalCount === 1 ? 'Enviar convite' : 'Enviar convites'}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
};

export default TeamOnboardingStep;
