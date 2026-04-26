import { ptBR } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Formats a date string or Date object to a specific format in the Brasília timezone.
 * @param date The date to format (string, timestamp, or Date)
 * @param formatStr The date-fns format string (default: 'dd/MM/yyyy')
 */
export function formatBR(date: string | number | Date | null | undefined, formatStr: string = 'dd/MM/yyyy'): string {
  if (!date) return '';
  
  try {
    // If it's a YYYY-MM-DD string, append time to avoid UTC midnight shift
    let parsedDate: Date;
    if (typeof date === 'string') {
      if (date.length === 10) {
        // "YYYY-MM-DD" -> "YYYY-MM-DDT12:00:00" to safely fall in the correct day regardless of timezone
        parsedDate = new Date(`${date}T12:00:00`);
      } else {
        parsedDate = new Date(date);
      }
    } else {
      parsedDate = new Date(date);
    }

    if (isNaN(parsedDate.getTime())) return '';

    return formatInTimeZone(parsedDate, TIMEZONE, formatStr, { locale: ptBR });
  } catch (e) {
    console.error('Error formatting date:', date, e);
    return '';
  }
}

/**
 * Gets the current date/time in the Brasília timezone.
 */
export function getNowBR(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Gets the current date in YYYY-MM-DD format in the Brasília timezone.
 */
export function getTodayBR(): string {
  return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
}
