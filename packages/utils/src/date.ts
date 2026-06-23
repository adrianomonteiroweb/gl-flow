import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { format, toDate } from 'date-fns';

export * from 'date-fns';

export const GLOBAL_CONFIG = {
  timezone: 'America/Fortaleza',
  timezoneOffset: '-03:00',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  locale: ptBR,
};

export const toDateTz = (date: string | Date | number): Date => {
  return toZonedTime(date, GLOBAL_CONFIG.timezone);
};

export const fixTimeZoneTo = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  const second = pad(date.getUTCSeconds());

  return toDate(`${year}-${month}-${day}T${hour}:${minute}:${second}${GLOBAL_CONFIG.timezoneOffset}`);
};

export const formatInTimeZone = (
  date: Date | string | number,
  format_string: string = GLOBAL_CONFIG.dateFormat,
  timezone: string = GLOBAL_CONFIG.timezone
): string => {
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, format_string, { locale: GLOBAL_CONFIG.locale });
};

export const addTime = (date: Date, time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + (hours || 0));
  newDate.setMinutes(newDate.getMinutes() + (minutes || 0));
  return newDate;
};

export const joinDateAndTime = (date: Date | string | number, time: string): Date => {
  return addTime(toDateTz(date), time);
};

export const joinAndFormatDateTime = (
  date: Date | string | number,
  time: string,
  format_string: string = GLOBAL_CONFIG.dateTimeFormat,
  timezone: string = GLOBAL_CONFIG.timezone
): string => {
  const dateTime = joinDateAndTime(date, time);
  return formatInTimeZone(dateTime, format_string, timezone);
};
