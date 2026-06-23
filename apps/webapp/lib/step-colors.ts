export type StepColorName =
  | 'blue'
  | 'emerald'
  | 'purple'
  | 'green'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'pink'
  | 'cyan'
  | 'indigo'
  | 'amber'
  | 'teal';

export type StepColorClasses = {
  headerBg: string;
  countBadge: string;
  iconText: string;
  dot: string;
};

export const STEP_COLOR_PALETTE: StepColorName[] = [
  'blue',
  'emerald',
  'purple',
  'green',
  'red',
  'orange',
  'yellow',
  'pink',
  'cyan',
  'indigo',
  'amber',
  'teal',
];

export const STEP_COLOR_MAP: Record<StepColorName, StepColorClasses> = {
  blue: {
    headerBg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    countBadge: 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100',
    iconText: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  emerald: {
    headerBg: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    countBadge: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100',
    iconText: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  purple: {
    headerBg: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
    countBadge: 'bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-100',
    iconText: 'text-purple-700 dark:text-purple-400',
    dot: 'bg-purple-500',
  },
  green: {
    headerBg: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    countBadge: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
    iconText: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
  },
  red: {
    headerBg: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    countBadge: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100',
    iconText: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  orange: {
    headerBg: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
    countBadge: 'bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100',
    iconText: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
  yellow: {
    headerBg: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    countBadge: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100',
    iconText: 'text-yellow-700 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  pink: {
    headerBg: 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800',
    countBadge: 'bg-pink-200 text-pink-900 dark:bg-pink-800 dark:text-pink-100',
    iconText: 'text-pink-700 dark:text-pink-400',
    dot: 'bg-pink-500',
  },
  cyan: {
    headerBg: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800',
    countBadge: 'bg-cyan-200 text-cyan-900 dark:bg-cyan-800 dark:text-cyan-100',
    iconText: 'text-cyan-700 dark:text-cyan-400',
    dot: 'bg-cyan-500',
  },
  indigo: {
    headerBg: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800',
    countBadge: 'bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100',
    iconText: 'text-indigo-700 dark:text-indigo-400',
    dot: 'bg-indigo-500',
  },
  amber: {
    headerBg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    countBadge: 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100',
    iconText: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  teal: {
    headerBg: 'bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800',
    countBadge: 'bg-teal-200 text-teal-900 dark:bg-teal-800 dark:text-teal-100',
    iconText: 'text-teal-700 dark:text-teal-400',
    dot: 'bg-teal-500',
  },
};

const FALLBACK_COLOR_CLASSES: StepColorClasses = {
  headerBg: 'bg-muted/60',
  countBadge: 'bg-background text-foreground',
  iconText: 'text-muted-foreground',
  dot: 'bg-muted-foreground',
};

export const getStepColorClasses = (color: string | null | undefined): StepColorClasses => {
  if (color && color in STEP_COLOR_MAP) {
    return STEP_COLOR_MAP[color as StepColorName];
  }

  return FALLBACK_COLOR_CLASSES;
};

export const getNextPaletteColor = (existingColors: (string | null | undefined)[]): StepColorName => {
  const used = new Set(existingColors.filter(Boolean));
  const available = STEP_COLOR_PALETTE.find(c => !used.has(c));

  return available ?? STEP_COLOR_PALETTE[existingColors.length % STEP_COLOR_PALETTE.length] ?? 'blue';
};
