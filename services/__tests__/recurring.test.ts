import { carryOverFixedExpenses, getFixedExpenses } from '../recurring';
import { getTransactions, addTransaction } from '../transactions';
import { encodeSplit } from '../../types';
import type { Transaction } from '../../types';

jest.mock('../transactions');

const mockGetTransactions = getTransactions as jest.MockedFunction<typeof getTransactions>;
const mockAddTransaction = addTransaction as jest.MockedFunction<typeof addTransaction>;

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'u',
    date: '2026-06-05',
    category: 'Hogar',
    description: 'Arriendo',
    amount: 450000,
    payment_method: 'Transferencia',
    is_fixed: true,
    notes: null,
    week: 23,
    registered: false,
    month: '2026-06',
    created_at: '2026-06-05T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockAddTransaction.mockImplementation(async (t) => tx({ ...t, month: t.date.substring(0, 7) }));
});

/** getTransactions is called for both months; route by argument. */
function setMonths(source: Transaction[], target: Transaction[]) {
  mockGetTransactions.mockImplementation(async (month: string) =>
    month === '2026-06' ? source : target,
  );
}

describe('getFixedExpenses', () => {
  it('returns only fixed expenses', async () => {
    setMonths([tx({ is_fixed: true }), tx({ is_fixed: false, description: 'Almuerzo' })], []);
    const fixed = await getFixedExpenses('2026-06');
    expect(fixed).toHaveLength(1);
    expect(fixed[0].description).toBe('Arriendo');
  });
});

describe('carryOverFixedExpenses', () => {
  it('copies fixed expenses into the target month, mapping the day of month', async () => {
    setMonths([tx({ date: '2026-06-05' })], []);

    const res = await carryOverFixedExpenses('2026-06', '2026-07');

    expect(res).toEqual({ created: 1, skipped: 0 });
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
    expect(mockAddTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-07-05',
        category: 'Hogar',
        description: 'Arriendo',
        amount: 450000,
        is_fixed: true,
        registered: false,
      }),
    );
  });

  it('does not copy non-fixed expenses', async () => {
    setMonths([tx({ is_fixed: false })], []);

    const res = await carryOverFixedExpenses('2026-06', '2026-07');

    expect(res).toEqual({ created: 0, skipped: 0 });
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it('is idempotent: skips expenses already present in the target month', async () => {
    const arriendo = tx({});
    setMonths([arriendo], [tx({ month: '2026-07', date: '2026-07-05' })]);

    const res = await carryOverFixedExpenses('2026-06', '2026-07');

    expect(res).toEqual({ created: 0, skipped: 1 });
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it('deduplicates identical fixed expenses within the same run', async () => {
    setMonths([tx({}), tx({})], []);

    const res = await carryOverFixedExpenses('2026-06', '2026-07');

    expect(res).toEqual({ created: 1, skipped: 1 });
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('copies a split fixed expense as a plain expense with the user notes only', async () => {
    const splitNotes = encodeSplit(
      [{ name: 'Ana', amount: 10000, debtId: 'd1' }],
      30000,
      'depto compartido',
    );
    setMonths([tx({ amount: 20000, notes: splitNotes, description: 'Internet' })], []);

    const res = await carryOverFixedExpenses('2026-06', '2026-07');

    expect(res).toEqual({ created: 1, skipped: 0 });
    // The split metadata must NOT carry over (it would recreate phantom debts).
    expect(mockAddTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 20000, notes: 'depto compartido' }),
    );
  });

  it('clamps the day when the target month is shorter', async () => {
    mockGetTransactions.mockImplementation(async (month: string) =>
      month === '2026-01' ? [tx({ date: '2026-01-31', month: '2026-01' })] : [],
    );

    await carryOverFixedExpenses('2026-01', '2026-02');

    expect(mockAddTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-02-28' }),
    );
  });
});
