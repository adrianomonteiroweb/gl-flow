export type StatusColorName = 'green' | 'red' | 'yellow';

type StatusColorOption = {
  value: StatusColorName | null;
  label: string;
  dot: string;
  ring: string;
};

export const STATUS_COLOR_OPTIONS: StatusColorOption[] = [
  { value: null, label: 'Sem cor', dot: 'bg-muted-foreground/30', ring: 'ring-muted-foreground/40' },
  { value: 'green', label: 'Sucesso', dot: 'bg-green-500 dark:bg-green-400', ring: 'ring-green-500/40' },
  { value: 'red', label: 'Falha', dot: 'bg-red-500 dark:bg-red-400', ring: 'ring-red-500/40' },
  { value: 'yellow', label: 'Ocorrência', dot: 'bg-yellow-500 dark:bg-yellow-400', ring: 'ring-yellow-500/40' },
];

export const getStatusDotClass = (color: string | null | undefined): string => {
  if (!color) {
    return 'bg-muted-foreground/30';
  }

  const option = STATUS_COLOR_OPTIONS.find(o => o.value === color);

  return option?.dot ?? 'bg-muted-foreground/30';
};
