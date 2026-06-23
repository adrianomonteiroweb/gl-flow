'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Check, Trash2, Loader2, CalendarClock } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import { Label } from '@workspace/ui/components/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import { cn } from '@workspace/ui/lib/utils';
import { DateFormatter } from '@workspace/utils';
import { getLeadTasks, createTask, toggleTask, deleteTask } from '@/actions/tasks';
import { getTaskStatus, statusLabel, type TaskLike, type TaskStatus } from '@/utils/task-status';

interface LeadTasksSectionProps {
  leadId: string;
  onTasksChanged?: (tasks: TaskLike[]) => void;
}

const statusBadgeClass: Record<TaskStatus, string> = {
  future: 'bg-muted text-muted-foreground',
  'due-today': 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export const LeadTasksSection = ({ leadId, onTasksChanged }: LeadTasksSectionProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const syncTasks = useCallback(
    (list: any[]) => {
      setTasks(list);
      onTasksChanged?.(list as TaskLike[]);
    },
    [onTasksChanged]
  );

  const fetchTasks = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getLeadTasks(leadId);

      if (result.success) {
        syncTasks(result.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [leadId, syncTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreate = async () => {
    if (!title.trim() || !dueDate) {
      toast.error('Informe título e prazo');
      return;
    }

    setCreating(true);

    try {
      const result = await createTask({
        leadId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
      });

      if (!result.success) {
        toast.error(result.error || 'Erro ao criar tarefa');
        return;
      }

      setTitle('');
      setDescription('');
      setDueDate('');
      toast.success('Tarefa criada');
      await fetchTasks();
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (taskId: string) => {
    setBusyId(taskId);

    try {
      const result = await toggleTask(taskId);

      if (!result.success) {
        toast.error(result.error || 'Erro ao atualizar tarefa');
        return;
      }

      await fetchTasks();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    setBusyId(taskId);

    try {
      const result = await deleteTask(taskId);

      if (!result.success) {
        toast.error(result.error || 'Erro ao remover tarefa');
        return;
      }

      toast.success('Tarefa removida');
      await fetchTasks();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-border p-3">
        <Label htmlFor="task-title" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Nova tarefa
        </Label>
        <Input id="task-title" placeholder="Título da tarefa" value={title} onChange={e => setTitle(e.target.value)} maxLength={255} />
        <Textarea
          placeholder="Descrição (opcional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="min-h-[60px] resize-none"
          maxLength={1000}
        />
        <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <CalendarClock className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhuma tarefa cadastrada.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map(task => {
            const status = getTaskStatus(task as TaskLike);
            const done = status === 'completed';

            return (
              <li key={task.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn('h-6 w-6 shrink-0 rounded-full', done && 'bg-emerald-600 text-white hover:bg-emerald-600')}
                    onClick={() => handleToggle(task.id)}
                    disabled={busyId === task.id}
                    aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}>
                    {done && <Check className="h-3.5 w-3.5" />}
                  </Button>

                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', done && 'text-muted-foreground line-through')}>{task.title}</p>
                    {task.description && <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>}
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', statusBadgeClass[status])}>{statusLabel[status]}</span>
                      <span className="text-xs text-muted-foreground">{DateFormatter.dateTime(task.due_date)}</span>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        disabled={busyId === task.id}
                        aria-label="Remover tarefa">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá a tarefa <strong>{task.title}</strong> e não poderá ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(task.id)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
