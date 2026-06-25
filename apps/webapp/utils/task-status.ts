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
