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
    dotClass: 'bg-red-500',
    circleClass: 'bg-red-100 text-red-700 border border-red-300',
    icon: 'chevron-left',
    label: 'Ver tarefas vencidas',
  },
  near: {
    dotClass: 'bg-amber-500',
    circleClass: 'bg-amber-100 text-amber-700 border border-amber-300',
    icon: 'chevron-down',
    label: 'Ver tarefas que vencem hoje',
  },
  pending: {
    dotClass: 'bg-gray-400',
    circleClass: 'bg-gray-100 text-gray-700 border border-gray-300',
    icon: 'chevron-right',
    label: 'Ver tarefas pendentes',
  },
  done: {
    dotClass: 'bg-green-500',
    circleClass: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    icon: 'check',
    label: 'Ver tarefas concluídas',
  },
};
