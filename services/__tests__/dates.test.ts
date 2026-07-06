import {
  addMonths,
  lastMonthsUpTo,
  pastMonths,
  currentMonth,
  sameDayInMonth,
  formatMonthLong,
  formatMonthShort,
  shortMonthName,
  formatFullDate,
} from '../dates';

describe('addMonths', () => {
  it('shifts forward within a year', () => {
    expect(addMonths('2026-03', 2)).toBe('2026-05');
  });

  it('shifts backward across a year boundary', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('shifts forward across a year boundary', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });

  it('handles jumps of more than a year', () => {
    expect(addMonths('2026-07', -13)).toBe('2025-06');
  });

  it('returns the same month for delta 0', () => {
    expect(addMonths('2026-07', 0)).toBe('2026-07');
  });
});

describe('lastMonthsUpTo', () => {
  it('returns n consecutive months ending at the given month, oldest first', () => {
    expect(lastMonthsUpTo('2026-03', 3)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('crosses year boundaries', () => {
    expect(lastMonthsUpTo('2026-01', 2)).toEqual(['2025-12', '2026-01']);
  });
});

describe('pastMonths', () => {
  it('ends at the current month and is consecutive', () => {
    const months = pastMonths(6);
    expect(months).toHaveLength(6);
    expect(months[5]).toBe(currentMonth());
    for (let i = 1; i < months.length; i++) {
      expect(addMonths(months[i - 1], 1)).toBe(months[i]);
    }
  });
});

describe('sameDayInMonth', () => {
  it('keeps the day when it exists in the target month', () => {
    expect(sameDayInMonth('2026-03-15', '2026-04')).toBe('2026-04-15');
  });

  it('clamps the 31st to a 30-day month', () => {
    expect(sameDayInMonth('2026-01-31', '2026-04')).toBe('2026-04-30');
  });

  it('clamps to February 28 on non-leap years', () => {
    expect(sameDayInMonth('2026-01-31', '2026-02')).toBe('2026-02-28');
  });

  it('clamps to February 29 on leap years', () => {
    expect(sameDayInMonth('2024-01-31', '2024-02')).toBe('2024-02-29');
  });
});

describe('month/date formatting', () => {
  it('formats long months in both locales', () => {
    expect(formatMonthLong('2026-07', 'es')).toBe('julio 2026');
    expect(formatMonthLong('2026-07', 'en')).toBe('July 2026');
  });

  it('formats short months in both locales', () => {
    expect(formatMonthShort('2026-07', 'es')).toBe('jul');
    expect(formatMonthShort('2026-07', 'en')).toBe('Jul');
  });

  it('maps 1-based month numbers to short names', () => {
    expect(shortMonthName(1, 'es')).toBe('ene');
    expect(shortMonthName(12, 'en')).toBe('Dec');
  });

  it('formats a full date in both locales', () => {
    expect(formatFullDate('2026-07-06', 'es')).toBe('Lun, 6 de julio 2026');
    expect(formatFullDate('2026-07-06', 'en')).toBe('Mon, July 6, 2026');
  });
});
