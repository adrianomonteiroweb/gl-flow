import { removeUser } from '@/actions/users';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { TrashIcon } from 'lucide-react';
import SubmitButton from '@workspace/ui/components/submit-button';
import { useState } from 'react';

export function DeleteUserButton({ user }: any) {
  const [open, setOpen] = useState(false);

  const handleAction = async () => {
    try {
      await removeUser(user.id);
      toast.success('Usuário removido com sucesso.');
      document.dispatchEvent(new Event('users:updated'));
    } catch (error) {
      console.log(error);
      toast.error('Ops! Ocorreu um erro ao processar sua requisição.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" title="Remover Usuário">
          <TrashIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <form action={handleAction}>
          <DialogHeader>
            <DialogTitle>Remover usuário</DialogTitle>
          </DialogHeader>

          <div className="mt-5 mb-5">Deseja realmente remover {user.name}?</div>

          <DialogFooter>
            <SubmitButton variant={'destructive'}>Sim, remova {user?.name}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
