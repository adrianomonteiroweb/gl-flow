'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Check, Trash2, Loader2 } from 'lucide-react';

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
} from '@workspace/ui/components/alert-dialog';
import { getLeadTasks, createTask, toggleTask, deleteTask } from '@/actions/tasks';
import { getTaskStatus, statusLabel, type TaskLike, type TaskStatus } from '@/utils/task-status';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  completed_at: string | null;
  assignee_id: string | null;
}

const statusStyles: Record<TaskStatus, { card: string; checkbox: string; label: string }> = {
  future: {
    card: 'border-gray-200 bg-gray-50',
    checkbox: 'border-gray-300 text-gray-400',
    label: 'text-gray-500',
  },
  'due-today': {
    card: 'border-amber-200 bg-amber-50',
    checkbox: 'border-amber-400 text-amber-600',
    label: 'text-amber-700 font-medium',
  },
  overdue: {
    card: 'border-red-200 bg-red-50',
    checkbox: 'border-red-400 text-red-600',
    label: 'text-red-700 font-medium',
  },
  completed: {
    card: 'border-gray-200 bg-gray-50 opacity-60',
    checkbox: 'border-emerald-400 bg-emerald-100 text-emerald-700',
    label: 'text-gray-400',
  },
};

const formatDueDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface LeadTasksSectionProps {
  leadId: string;
  onTasksChanged?: (tasks: TaskLike[]) => void;
}

export const LeadTasksSection = ({ leadId, onTasksChanged }: LeadTasksSectionProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const result = await getLeadTasks(leadId);

    if (result.success) {
      const data = result.data as Task[];
      setTasks(data);
      onTasksChanged?.(data);
    }

    setLoading(false);
  }, [leadId, onTasksChanged]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreate = async () => {
    if (!title.trim() || !dueDate) {
      return;
    }

    setSubmitting(true);
    const result = await createTask({
      leadId,
      title: title.trim(),
      dueDate,
      description: description.trim() || undefined,
    });

    if (result.success) {
      setTitle('');
      setDueDate('');
      setDescription('');
      setShowForm(false);
      await fetchTasks();
    }

    setSubmitting(false);
  };

  const handleToggle = async (taskId: string) => {
    const optimisticTasks = tasks.map(t => (t.id === taskId ? { ...t, completed_at: t.completed_at ? null : new Date().toISOString() } : t));

    setTasks(optimisticTasks);
    onTasksChanged?.(optimisticTasks);

    const result = await toggleTask(taskId);

    if (!result.success) {
      await fetchTasks();
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) {
      return;
    }

    const taskId = pendingDeleteId;
    setPendingDeleteId(null);

    const optimisticTasks = tasks.filter(t => t.id !== taskId);
    setTasks(optimisticTasks);
    onTasksChanged?.(optimisticTasks);

    const result = await deleteTask(taskId);

    if (!result.success) {
      await fetchTasks();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Tarefas</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowForm(!showForm)}
          aria-label={showForm ? 'Fechar formulário' : 'Nova tarefa'}>
          <Plus className={`h-4 w-4 transition-transform ${showForm ? 'rotate-45' : ''}`} />
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
          <div>
            <Label htmlFor="task-title" className="text-xs font-medium text-gray-600">
              Título *
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              className="mt-1 h-9 text-sm"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="task-due-date" className="text-xs font-medium text-gray-600">
              Prazo *
            </Label>
            <Input id="task-due-date" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 h-9 text-sm" />
          </div>

          <div>
            <Label htmlFor="task-description" className="text-xs font-medium text-gray-600">
              Descrição
            </Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
              className="mt-1 text-sm resize-none"
            />
          </div>

          <Button onClick={handleCreate} disabled={!title.trim() || !dueDate || submitting} className="w-full h-9 text-sm" size="sm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar tarefa
          </Button>
        </div>
      )}

      {tasks.length === 0 && !showForm && <p className="text-center py-8 text-sm text-gray-400">Nenhuma tarefa</p>}

      <div className="space-y-2">
        {tasks.map(task => {
          const status = getTaskStatus(task);
          const styles = statusStyles[status];

          return (
            <div
              key={task.id}
              className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${styles.card} hover:shadow-sm`}
              onClick={() => handleToggle(task.id)}
              role="checkbox"
              aria-checked={!!task.completed_at}
              aria-label={`${task.title} — ${statusLabel[status]}`}
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle(task.id);
                }
              }}>
              <div
                className={`flex-shrink-0 mt-0.5 flex items-center justify-center h-6 w-6 rounded-full border-2 transition-colors ${styles.checkbox}`}>
                {task.completed_at && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${task.completed_at ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {task.title}
                </p>
                {task.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${styles.label}`}>{formatDueDate(task.due_date)}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles.label} ${
                      status === 'due-today'
                        ? 'bg-amber-100'
                        : status === 'overdue'
                          ? 'bg-red-100'
                          : status === 'completed'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100'
                    }`}>
                    {statusLabel[status]}
                  </span>
                </div>
              </div>

              <button
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                onClick={e => {
                  e.stopPropagation();
                  setPendingDeleteId(task.id);
                }}
                aria-label={`Remover tarefa ${task.title}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={open => {
          if (!open) setPendingDeleteId(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta tarefa? Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
