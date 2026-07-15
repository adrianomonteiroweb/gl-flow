'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Check,
  Trash2,
  Loader2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import { Label } from '@workspace/ui/components/label';
import { Progress } from '@workspace/ui/components/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';
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
import { cn } from '@workspace/ui/lib/utils';
import { DateFormatter } from '@workspace/utils';

import { getLeadTasks, createTask, toggleTask, updateTask, deleteTask } from '@/actions/tasks';
import {
  getTaskStatus,
  statusLabel,
  statusTone,
  statusIcon,
  formatDueRelative,
  TASK_GROUP_ORDER,
  taskGroupLabel,
  type TaskLike,
  type TaskStatus,
  type TaskStatusIcon,
} from '@/utils/task-status';
import { getToneClasses } from '@/lib/tone-colors';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  completed_at: string | null;
  assignee_id: string | null;
}

const STATUS_ICON: Record<TaskStatusIcon, LucideIcon> = {
  clock: Clock,
  alert: AlertTriangle,
  calendar: CalendarDays,
  check: CheckCircle2,
};

const DUE_PRESETS: { key: string; label: string; offset: number }[] = [
  { key: 'today', label: 'Hoje', offset: 0 },
  { key: 'tomorrow', label: 'Amanhã', offset: 1 },
  { key: 'in3', label: '+3 dias', offset: 3 },
  { key: 'nextweek', label: 'Próx. semana', offset: 7 },
];

/** Build a `datetime-local` string (local time), defaulting to 09:00. */
const toLocalInput = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildPresetValue = (offset: number): string => {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() + offset);

  return toLocalInput(date);
};

// ─── Quick add ───────────────────────────────────────────────────────────────

interface TaskQuickAddProps {
  leadId: string;
  onCreated: () => void;
}

const TaskQuickAdd = ({ leadId, onCreated }: TaskQuickAddProps) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => buildPresetValue(0));
  const [activePreset, setActivePreset] = useState<string>('today');
  const [description, setDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);

  const applyPreset = (key: string, offset: number) => {
    setActivePreset(key);
    setDueDate(buildPresetValue(offset));
  };

  const handleCustomDate = (value: string) => {
    setActivePreset('custom');
    setDueDate(value);
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setDueDate(buildPresetValue(0));
    setActivePreset('today');
    setShowAdvanced(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error('Informe o título da tarefa');
      return;
    }

    if (!dueDate) {
      toast.error('Informe o prazo');
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

      toast.success('Tarefa criada');
      reset();
      onCreated();
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Adicionar tarefa..."
          maxLength={255}
          aria-label="Título da nova tarefa"
        />
        <Button type="submit" size="icon" className="shrink-0" disabled={creating} aria-label="Adicionar tarefa">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs text-muted-foreground">Prazo:</span>

        {DUE_PRESETS.map(preset => {
          const active = activePreset === preset.key;

          return (
            <Button
              key={preset.key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.key, preset.offset)}
              aria-pressed={active}
              className={cn('h-7 rounded-full px-3 text-xs', active && 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}>
              {preset.label}
            </Button>
          );
        })}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(value => !value)}
          aria-expanded={showAdvanced}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground">
          {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Mais opções
        </Button>
      </div>

      {showAdvanced && (
        <div className="space-y-2 pt-1">
          <div className="space-y-1">
            <Label htmlFor="task-due" className="text-xs text-muted-foreground">
              Data e hora
            </Label>
            <Input id="task-due" type="datetime-local" value={dueDate} onChange={e => handleCustomDate(e.target.value)} />
          </div>

          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="min-h-[60px] resize-none"
            maxLength={1000}
            aria-label="Descrição da tarefa"
          />
        </div>
      )}
    </form>
  );
};

// ─── Task card (display + inline edit) ───────────────────────────────────────

interface TaskCardProps {
  task: Task;
  status: TaskStatus;
  highlighted: boolean;
  busy: boolean;
  onToggle: (taskId: string) => void;
  onRequestDelete: (task: Task) => void;
  onUpdated: () => void;
}

const TaskCard = ({ task, status, highlighted, busy, onToggle, onRequestDelete, onUpdated }: TaskCardProps) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [dueDate, setDueDate] = useState(() => toLocalInput(new Date(task.due_date)));
  const [saving, setSaving] = useState(false);

  const done = status === 'completed';
  const tone = statusTone[status];
  const StatusIcon = STATUS_ICON[statusIcon[status]];

  const startEdit = () => {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setDueDate(toLocalInput(new Date(task.due_date)));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Informe o título da tarefa');
      return;
    }

    setSaving(true);

    try {
      const result = await updateTask({
        taskId: task.id,
        title: title.trim(),
        description: description.trim() || null,
        dueDate,
      });

      if (!result.success) {
        toast.error(result.error || 'Erro ao atualizar tarefa');
        return;
      }

      toast.success('Tarefa atualizada');
      setEditing(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <li className="rounded-lg border border-border bg-card p-3">
        <div className="space-y-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={255} aria-label="Título da tarefa" autoFocus />
          <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} aria-label="Prazo da tarefa" />
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="min-h-[60px] resize-none"
            maxLength={1000}
            aria-label="Descrição da tarefa"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-card p-3 pl-4 transition-shadow hover:shadow-sm',
        done && 'opacity-70',
        highlighted && 'border-primary ring-2 ring-primary/40 animate-pulse motion-reduce:animate-none'
      )}>
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', getToneClasses(tone).dot)} />

      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Reabrir tarefa: ${task.title}` : `Concluir tarefa: ${task.title}`}
          onClick={() => onToggle(task.id)}
          disabled={busy}
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            done
              ? 'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400'
              : 'border-muted-foreground/40 hover:border-primary'
          )}>
          {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium leading-snug', done && 'text-muted-foreground line-through')}>{task.title}</p>
          {task.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', getToneClasses(tone).soft)}>
              <StatusIcon className="h-3 w-3" aria-hidden />
              {statusLabel[status]}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default text-xs text-muted-foreground">
                  {done ? DateFormatter.date(task.due_date) : formatDueRelative(task.due_date)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {DateFormatter.dateTime(task.due_date)}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={startEdit}
            disabled={busy}
            aria-label={`Editar tarefa: ${task.title}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRequestDelete(task)}
            disabled={busy}
            aria-label={`Remover tarefa: ${task.title}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
};

// ─── Section ─────────────────────────────────────────────────────────────────

interface LeadTasksSectionProps {
  leadId: string;
  onTasksChanged?: (tasks: TaskLike[]) => void;
}

export const LeadTasksSection = ({ leadId, onTasksChanged }: LeadTasksSectionProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState('');

  const knownIdsRef = useRef<Set<string> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncTasks = useCallback(
    (list: Task[]) => {
      setTasks(list);
      onTasksChanged?.(list as TaskLike[]);
    },
    [onTasksChanged]
  );

  const fetchTasks = useCallback(async () => {
    const result = await getLeadTasks(leadId);

    if (result.success) {
      const data = (result.data ?? []) as Task[];
      syncTasks(data);

      const currentIds = new Set(data.map(task => task.id));

      if (knownIdsRef.current === null) {
        knownIdsRef.current = currentIds;
      } else {
        const newIds = data.filter(task => !knownIdsRef.current!.has(task.id)).map(task => task.id);

        if (newIds.length > 0) {
          setHighlightedIds(new Set(newIds));
          setAnnouncement(newIds.length === 1 ? '1 nova tarefa adicionada' : `${newIds.length} novas tarefas adicionadas`);

          if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
          }

          highlightTimerRef.current = setTimeout(() => {
            setHighlightedIds(new Set());
            setAnnouncement('');
            highlightTimerRef.current = null;
          }, 5000);
        }

        knownIdsRef.current = currentIds;
      }
    }

    setLoading(false);
  }, [leadId, syncTasks]);

  useEffect(() => {
    fetchTasks();

    const interval = setInterval(fetchTasks, 10_000);
    document.addEventListener('tasks:refresh', fetchTasks);

    return () => {
      clearInterval(interval);
      document.removeEventListener('tasks:refresh', fetchTasks);

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [fetchTasks]);

  const notifyChange = useCallback(() => {
    document.dispatchEvent(new Event('tasks:refresh'));
  }, []);

  const handleToggle = useCallback(
    async (taskId: string) => {
      setBusyId(taskId);

      const optimistic = tasks.map(task =>
        task.id === taskId ? { ...task, completed_at: task.completed_at ? null : new Date().toISOString() } : task
      );
      syncTasks(optimistic);

      try {
        const result = await toggleTask(taskId);

        if (!result.success) {
          toast.error(result.error || 'Erro ao atualizar tarefa');
          await fetchTasks();
          return;
        }

        const nowDone = optimistic.find(task => task.id === taskId)?.completed_at;
        setAnnouncement(nowDone ? 'Tarefa concluída' : 'Tarefa reaberta');
        notifyChange();
      } finally {
        setBusyId(null);
      }
    },
    [tasks, syncTasks, fetchTasks, notifyChange]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }

    const taskId = pendingDelete.id;
    setPendingDelete(null);
    setBusyId(taskId);

    const optimistic = tasks.filter(task => task.id !== taskId);
    syncTasks(optimistic);

    try {
      const result = await deleteTask(taskId);

      if (!result.success) {
        toast.error(result.error || 'Erro ao remover tarefa');
        await fetchTasks();
        return;
      }

      toast.success('Tarefa removida');
      notifyChange();
    } finally {
      setBusyId(null);
    }
  }, [pendingDelete, tasks, syncTasks, fetchTasks, notifyChange]);

  const groups = useMemo(
    () =>
      TASK_GROUP_ORDER.map(status => ({
        status,
        items: tasks
          .filter(task => getTaskStatus(task as TaskLike) === status)
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
      })).filter(group => group.items.length > 0),
    [tasks]
  );

  const total = tasks.length;
  const doneCount = useMemo(() => tasks.filter(task => task.completed_at).length, [tasks]);
  const overdueCount = useMemo(() => tasks.filter(task => getTaskStatus(task as TaskLike) === 'overdue').length, [tasks]);
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <TaskQuickAdd leadId={leadId} onCreated={notifyChange} />

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <ClipboardCheck className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhuma tarefa cadastrada.</p>
        </div>
      ) : (
        <TooltipProvider delayDuration={200}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {doneCount} de {total} concluídas
              </span>
              {overdueCount > 0 && (
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', getToneClasses('danger').soft)}>
                  {overdueCount} {overdueCount === 1 ? 'vencida' : 'vencidas'}
                </span>
              )}
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <div className="space-y-4">
            {groups.map(group => {
              const isCompletedGroup = group.status === 'completed';
              const collapsed = isCompletedGroup && !showCompleted;

              return (
                <div key={group.status} className="space-y-2">
                  {isCompletedGroup ? (
                    <button
                      type="button"
                      onClick={() => setShowCompleted(value => !value)}
                      aria-expanded={showCompleted}
                      className="flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {showCompleted ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      {taskGroupLabel[group.status]} ({group.items.length})
                    </button>
                  ) : (
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', getToneClasses(statusTone[group.status]).dot)} />
                      {taskGroupLabel[group.status]} ({group.items.length})
                    </h4>
                  )}

                  {!collapsed && (
                    <ul className="space-y-2">
                      {group.items.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          status={group.status}
                          highlighted={highlightedIds.has(task.id)}
                          busy={busyId === task.id}
                          onToggle={handleToggle}
                          onRequestDelete={setPendingDelete}
                          onUpdated={notifyChange}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={open => {
          if (!open) {
            setPendingDelete(null);
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a tarefa <strong>{pendingDelete?.title}</strong> e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirmDelete}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
