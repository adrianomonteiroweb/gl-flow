export type ToneName = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type ToneClasses = {
  soft: string;
  softHover: string;
  dot: string;
};

export const TONE_MAP: Record<ToneName, ToneClasses> = {
  primary: {
    soft: 'border border-primary/20 bg-primary/10 text-primary',
    softHover: 'border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
    dot: 'bg-primary',
  },
  success: {
    soft: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
    softHover:
      'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  warning: {
    soft: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
    softHover:
      'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  danger: {
    soft: 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
    softHover:
      'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50',
    dot: 'bg-red-500 dark:bg-red-400',
  },
  info: {
    soft: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
    softHover:
      'border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50',
    dot: 'bg-blue-500 dark:bg-blue-400',
  },
  neutral: {
    soft: 'border border-border bg-muted text-muted-foreground',
    softHover: 'border border-border bg-muted text-foreground hover:bg-muted/80',
    dot: 'bg-muted-foreground',
  },
};

export const getToneClasses = (tone: ToneName | null | undefined): ToneClasses => {
  if (tone && tone in TONE_MAP) {
    return TONE_MAP[tone as ToneName];
  }

  return TONE_MAP.neutral;
};
