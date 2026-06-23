'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { createUser, updateUser, adminUpdateUserPassword } from '@/actions/users';
import { useSessionContext } from '@/contexts/session';
import { ASSIGNABLE_ROLES, DEFAULT_ROLE } from '@/lib/auth/permissions';
import { DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Label } from '@workspace/ui/components/label';
import { Input } from '@workspace/ui/components/input';
import { PasswordInput } from '@workspace/ui/components/password-input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@workspace/ui/components/select';
import { Separator } from '@workspace/ui/components/separator';
import SubmitButton from '@workspace/ui/components/submit-button';
import { validatePasswordSync } from '@/lib/auth/password-rules';
import { PasswordStrengthIndicator } from '@/components/auth/password-strength-indicator';

export function UserDialogForm({ user, onSubmit = () => {} }: any) {
  const { user: me } = useSessionContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [passwordValue, setPasswordValue] = useState('');
  const [newPasswordValue, setNewPasswordValue] = useState('');

  const canManagePasswords = me?.role === 'admin' || me?.role === 'owner';
  const isEditing = Boolean(user);

  const handleAction = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      if (!isEditing) {
        const password = data.get('password') as string;
        const confirmPassword = data.get('confirm-password') as string;

        if (password !== confirmPassword) {
          toast.error('As senhas não coincidem.');
          return;
        }

        const passwordCheck = validatePasswordSync(password);

        if (!passwordCheck.valid) {
          toast.error(passwordCheck.errors[0] ?? 'Senha muito fraca.');
          return;
        }

        const result = await createUser({
          name: data.get('name'),
          email: data.get('email'),
          role: data.get('role'),
          password,
        });

        if (result?.status !== 200) {
          toast.error(result?.message ?? 'Ocorreu um erro ao criar o usuário.');
          return;
        }

        toast.success('Usuário criado com sucesso.');
        onSubmit();
        document.dispatchEvent(new Event('users:updated'));

        return;
      }

      const updateResult = await updateUser(user.id, {
        name: data.get('name'),
        email: data.get('email'),
        role: data.get('role'),
      });

      if (updateResult === undefined || updateResult === null) {
        toast.error('Ocorreu um erro ao atualizar os dados do usuário.');
        return;
      }

      if (canManagePasswords) {
        const newPassword = (data.get('new-password') as string) ?? '';
        const confirmPassword = (data.get('confirm-new-password') as string) ?? '';

        if (newPassword) {
          const passwordResult = await adminUpdateUserPassword(user.id, newPassword, confirmPassword);

          if (passwordResult.status === 403) {
            toast.error('Você não tem permissão para alterar a senha deste usuário.');
            return;
          }

          if (passwordResult.status === 400) {
            toast.error(passwordResult.message ?? 'Dados de senha inválidos.');
            return;
          }

          if (passwordResult.status !== 200) {
            toast.error(passwordResult.message ?? 'Ocorreu um erro ao alterar a senha.');
            return;
          }
        }
      }

      toast.success('Usuário atualizado com sucesso.');
      onSubmit();
      document.dispatchEvent(new Event('users:updated'));
    } catch (error) {
      console.error(error);
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleAction}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar' : 'Novo'} Usuário</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4 mb-5 mt-3.5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name-input">Nome</Label>
          <Input id="name-input" name="name" defaultValue={user?.name} placeholder="Ex: Bruno Henrique" required className="col-span-3" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email-input">E-mail</Label>
          <Input
            id="email-input"
            name="email"
            type="email"
            defaultValue={user?.email}
            placeholder="Ex: nome@email.com"
            required
            className="col-span-3"
          />
        </div>

        {!isEditing && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password-input">Senha</Label>
              <PasswordInput
                id="password-input"
                name="password"
                placeholder="Mínimo 8 caracteres"
                required
                autoComplete="new-password"
                className="col-span-3"
                onChange={e => setPasswordValue(e.target.value)}
              />
              <PasswordStrengthIndicator password={passwordValue} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password-input">Confirme a Senha</Label>
              <PasswordInput
                id="confirm-password-input"
                name="confirm-password"
                placeholder="Repita a senha"
                required
                autoComplete="new-password"
                className="col-span-3"
              />
            </div>
          </>
        )}

        {user?.role !== 'owner' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-input">Papel</Label>
            <Select name="role" defaultValue={user?.role || DEFAULT_ROLE} required>
              <SelectTrigger id="role-input" className="col-span-3 w-full">
                <SelectValue placeholder="Selecione o papel" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isEditing && canManagePasswords && (
          <>
            <Separator />

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Alterar Senha</p>
              <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password-input">Nova Senha</Label>
              <PasswordInput
                id="new-password-input"
                name="new-password"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className="col-span-3"
                onChange={e => setNewPasswordValue(e.target.value)}
              />
              <PasswordStrengthIndicator password={newPasswordValue} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-new-password-input">Confirme a Nova Senha</Label>
              <PasswordInput
                id="confirm-new-password-input"
                name="confirm-new-password"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                className="col-span-3"
              />
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <SubmitButton isSubmitting={isSubmitting}>Salvar</SubmitButton>
      </DialogFooter>
    </form>
  );
}
