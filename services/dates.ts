// Shared date helpers. Months are "YYYY-MM", dates are "YYYY-MM-DD".

const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

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

/** "junio 2026" (lowercase month). */
export function formatMonthLong(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTHS_LONG[m - 1] ?? ''} ${year}`;
}

/** "jun" — short month label. */
export function formatMonthShort(month: string): string {
  const m = Number(month.split('-')[1]);
  return MONTHS_SHORT[m - 1] ?? '';
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
