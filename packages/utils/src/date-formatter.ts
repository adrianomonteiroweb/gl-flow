import { differenceInSeconds, differenceInDays, format, parseISO, isValid } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Timezone padrão para São Paulo
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export class DateFormatter {
  static dateTime(date: Date | string): string {
    if (!date) {
      return '-';
    }

    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(parsedDate)) {
        return '-';
      }

      const zonedDate = toZonedTime(parsedDate, DEFAULT_TIMEZONE);
      return format(zonedDate, 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return '-';
    }
  }

  static date(date: Date | string): string {
    if (!date) {
      return '-';
    }

    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(parsedDate)) {
        return '-';
      }

      const zonedDate = toZonedTime(parsedDate, DEFAULT_TIMEZONE);
      return format(zonedDate, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  }

  static time(date: Date | string): string {
    if (!date) {
      return '-';
    }

    try {
      const parsedDate = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(parsedDate)) {
        return '-';
      }

      const zonedDate = toZonedTime(parsedDate, DEFAULT_TIMEZONE);
      return format(zonedDate, 'HH:mm', { locale: ptBR });
    } catch {
      return '-';
    }
  }

  static diffInTime(startDate: Date | string, endDate: Date | string): string {
    if (!startDate || !endDate) {
      return '00:00:00';
    }

    try {
      const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
      const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

      if (!isValid(start) || !isValid(end)) {
        return '00:00:00';
      }

      const diffInSecs = differenceInSeconds(end, start);
      const days = Math.floor(diffInSecs / (24 * 3600));
      const hours = Math.floor((diffInSecs % (24 * 3600)) / 3600);
      const minutes = Math.floor((diffInSecs % 3600) / 60);
      const seconds = diffInSecs % 60;

      if (days > 0) {
        return `${days}d, ${hours}h e ${minutes}m`;
      }

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch {
      return '00:00:00';
    }
  }

  static moment(date: Date | string): Date {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return toZonedTime(parsedDate, DEFAULT_TIMEZONE);
  }

  static getRanges(startDate: Date, endDate: Date, divisionDays: number = 30): Array<{ start_date: Date; end_date: Date }> {
    const ranges = this.getDateBlocks(startDate, endDate, divisionDays);

    if (!ranges.length) {
      return [
        {
          start_date: startDate,
          end_date: endDate,
        },
      ];
    }

    return ranges.map(({ start, end }) => ({
      start_date: start,
      end_date: end,
    }));
  }

  static getDateBlocks(start: Date, end: Date, maxDays: number = 30): Array<{ start: Date; end: Date }> {
    const result: Array<{ start: Date; end: Date }> = [];
    const current = new Date(start);

    while (current < end) {
      const blockEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate() + maxDays);

      result.push({
        start: new Date(current),
        end: blockEnd <= end ? blockEnd : new Date(end),
      });

      current.setDate(current.getDate() + maxDays + 1);
    }

    return result;
  }
}

export const formatDateRelative = (date: Date | string): string => {
  if (!date) {
    return '-';
  }

  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      return '-';
    }

    const now = new Date();
    const seconds = differenceInSeconds(now, parsedDate);
    const days = differenceInDays(now, parsedDate);

    if (seconds < 60) {
      return 'agora';
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours}h`;
    } else if (days === 1) {
      return 'ontem';
    } else if (days < 7) {
      return `${days}d`;
    } else {
      const zonedDate = toZonedTime(parsedDate, DEFAULT_TIMEZONE);
      return format(zonedDate, 'dd/MM/yy', { locale: ptBR });
    }
  } catch {
    return '-';
  }
};

export const formatTime = (date: Date | string): string => {
  return DateFormatter.time(date);
};

export default DateFormatter;
