// Shared date helpers. Months are "YYYY-MM", dates are "YYYY-MM-DD".

import { useLocaleStore } from '../store/localeStore';
import type { Locale } from './i18n';

const MONTHS_LONG: Record<Locale, string[]> = {
  es: [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

const MONTHS_SHORT: Record<Locale, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const DAYS_SHORT: Record<Locale, string[]> = {
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/** The active locale, read non-reactively (these helpers run during render). */
function activeLocale(): Locale {
  return useLocaleStore.getState().locale;
}

export function today(): string {
  return new Date().toISOString().substring(0, 10);
}

export function currentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

/** Shifts a "YYYY-MM" month by `delta` months (negative = past). */
export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** The last `n` months up to and including the current one, oldest first. */
export function pastMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().substring(0, 7));
  }
  return months;
}

/** "junio 2026" / "June 2026". */
export function formatMonthLong(month: string, locale: Locale = activeLocale()): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTHS_LONG[locale][m - 1] ?? ''} ${year}`;
}

/** "jun" / "Jun" — short month label. */
export function formatMonthShort(month: string, locale: Locale = activeLocale()): string {
  const m = Number(month.split('-')[1]);
  return MONTHS_SHORT[locale][m - 1] ?? '';
}

/** Short month name from a 1-based month number ("YYYY-MM-DD" uses these). */
export function shortMonthName(monthNumber: number, locale: Locale = activeLocale()): string {
  return MONTHS_SHORT[locale][monthNumber - 1] ?? '';
}

/** Long, human date for a "YYYY-MM-DD" string: "Lun, 9 de junio 2026" / "Mon, June 9, 2026". */
export function formatFullDate(dateStr: string, locale: Locale = activeLocale()): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = DAYS_SHORT[locale][d.getDay()];
  const monthName = MONTHS_LONG[locale][d.getMonth()];
  if (locale === 'en') {
    return `${day}, ${monthName} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return `${day}, ${d.getDate()} de ${monthName} ${d.getFullYear()}`;
}

/** The `n` months ending at (and including) `month`, oldest first. */
export function lastMonthsUpTo(month: string, n: number): string[] {
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) months.push(addMonths(month, -i));
  return months;
}

/**
 * Maps a source date to the same day-of-month in a target month, clamped to the
 * target month's length (e.g. the 31st becomes the 28th/29th in February).
 */
export function sameDayInMonth(sourceDate: string, targetMonth: string): string {
  const day = Number(sourceDate.split('-')[2]) || 1;
  const [y, m] = targetMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const clamped = Math.min(day, lastDay);
  return `${targetMonth}-${String(clamped).padStart(2, '0')}`;
}
