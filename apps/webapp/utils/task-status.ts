import { DateFormatter } from '@workspace/utils';

import { getToneClasses, type ToneName } from '@/lib/tone-colors';

export type TaskStatus = 'future' | 'due-today' | 'overdue' | 'completed';

export interface TaskLike {
  due_date: string;
  completed_at: string | null;
}

export const getTaskStatus = (task: TaskLike): TaskStatus => {
  if (task.completed_at) {
    return 'completed';
  }

  const now = new Date();
  const due = new Date(task.due_date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due_day = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (due_day < today) {
    return 'overdue';
  }

  if (due_day.getTime() === today.getTime()) {
    return 'due-today';
  }

  return 'future';
};

export const statusLabel: Record<TaskStatus, string> = {
  future: 'A vencer',
  'due-today': 'Vence hoje',
  overdue: 'Vencida',
  completed: 'Concluída',
};

/** Semantic tone per status — single source of truth for pills, borders and dots. */
export const statusTone: Record<TaskStatus, ToneName> = {
  future: 'neutral',
  'due-today': 'warning',
  overdue: 'danger',
  completed: 'success',
};

/** Icon key per status, mapped to a lucide component in the UI layer. */
export type TaskStatusIcon = 'clock' | 'alert' | 'calendar' | 'check';

export const statusIcon: Record<TaskStatus, TaskStatusIcon> = {
  future: 'calendar',
  'due-today': 'clock',
  overdue: 'alert',
  completed: 'check',
};

/** Group rendering order and section headings for the task list. */
export const TASK_GROUP_ORDER: TaskStatus[] = ['overdue', 'due-today', 'future', 'completed'];

export const taskGroupLabel: Record<TaskStatus, string> = {
  overdue: 'Vencidas',
  'due-today': 'Vence hoje',
  future: 'A vencer',
  completed: 'Concluídas',
};

const MS_PER_DAY = 86_400_000;

/**
 * pt-BR relative due phrase for open tasks, covering future and past with
 * day granularity (recognition over recall). Falls back to an exact date for
 * horizons beyond ~30 days. Exact date/time stays available via DateFormatter.
 */
export const formatDueRelative = (dueDate: string): string => {
  const due = new Date(dueDate);

  if (Number.isNaN(due.getTime())) {
    return '-';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due_day = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff_days = Math.round((due_day.getTime() - today.getTime()) / MS_PER_DAY);

  if (diff_days === 0) {
    return 'vence hoje';
  }

  if (diff_days === 1) {
    return 'vence amanhã';
  }

  if (diff_days === -1) {
    return 'venceu ontem';
  }

  if (diff_days > 0) {
    return diff_days <= 30 ? `vence em ${diff_days} dias` : `vence em ${DateFormatter.date(dueDate)}`;
  }

  const overdue_days = Math.abs(diff_days);

  return overdue_days <= 30 ? `atrasada há ${overdue_days} dias` : `atrasada desde ${DateFormatter.date(dueDate)}`;
};

export type LeadTaskAlert = 'overdue' | 'near' | 'pending' | 'done';

export const getLeadTaskAlert = (tasks: TaskLike[]): LeadTaskAlert | null => {
  if (!tasks?.length) {
    return null;
  }

  let has_near = false;
  let has_pending = false;

  for (const task of tasks) {
    const status = getTaskStatus(task);

    if (status === 'overdue') {
      return 'overdue';
    }

    if (status === 'due-today') {
      has_near = true;
    }

    if (status === 'future') {
      has_pending = true;
    }
  }

  if (has_near) {
    return 'near';
  }

  if (has_pending) {
    return 'pending';
  }

  return 'done';
};

export type LeadTaskAlertIcon = 'chevron-left' | 'chevron-down' | 'chevron-right' | 'check';

const ALERT_TONE: Record<LeadTaskAlert, ToneName> = {
  overdue: 'danger',
  near: 'warning',
  pending: 'neutral',
  done: 'success',
};

export const leadTaskAlertConfig: Record<
  LeadTaskAlert,
  {
    dotClass: string;
    circleClass: string;
    icon: LeadTaskAlertIcon;
    label: string;
  }
> = {
  overdue: {
    dotClass: getToneClasses(ALERT_TONE.overdue).dot,
    circleClass: getToneClasses(ALERT_TONE.overdue).soft,
    icon: 'chevron-left',
    label: 'Ver tarefas vencidas',
  },
  near: {
    dotClass: getToneClasses(ALERT_TONE.near).dot,
    circleClass: getToneClasses(ALERT_TONE.near).soft,
    icon: 'chevron-down',
    label: 'Ver tarefas que vencem hoje',
  },
  pending: {
    dotClass: getToneClasses(ALERT_TONE.pending).dot,
    circleClass: getToneClasses(ALERT_TONE.pending).soft,
    icon: 'chevron-right',
    label: 'Ver tarefas pendentes',
  },
  done: {
    dotClass: getToneClasses(ALERT_TONE.done).dot,
    circleClass: getToneClasses(ALERT_TONE.done).soft,
    icon: 'check',
    label: 'Ver tarefas concluídas',
  },
};
