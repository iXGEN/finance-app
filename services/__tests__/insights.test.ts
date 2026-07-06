import { getMonthlyOverview } from '../insights';
import { getSpentByMonths } from '../transactions';
import { getBudgetSummary } from '../budget';
import { getDebts } from '../debts';

jest.mock('../transactions');
jest.mock('../budget');
jest.mock('../debts');
jest.mock('../../store/userConfigStore', () => ({
  useUserConfigStore: {
    getState: () => ({ categories: ['Comida', 'Transporte', 'Hogar'] }),
  },
}));

const mockSpentByMonths = getSpentByMonths as jest.MockedFunction<typeof getSpentByMonths>;
const mockBudgetSummary = getBudgetSummary as jest.MockedFunction<typeof getBudgetSummary>;
const mockGetDebts = getDebts as jest.MockedFunction<typeof getDebts>;

beforeEach(() => {
  jest.clearAllMocks();

  mockBudgetSummary.mockResolvedValue([
    { category: 'Comida', budget: 300000, spent: 250000 },
    { category: 'Transporte', budget: 80000, spent: 90000 },
    { category: 'Hogar', budget: 500000, spent: 0 },
  ]);
  mockSpentByMonths.mockResolvedValue({
    '2025-10': 100000,
    '2025-11': 200000,
    '2025-12': 0,
    '2026-01': 300000,
    '2026-02': 280000,
    '2026-03': 340000,
  });
  mockGetDebts.mockResolvedValue([
    { id: 'd1', user_id: 'u', person: 'Ana', amount: 15000, description: null, date: '2026-03-01', paid: false, created_at: '' },
    { id: 'd2', user_id: 'u', person: 'Luis', amount: -8000, description: null, date: '2026-03-02', paid: false, created_at: '' },
    { id: 'd3', user_id: 'u', person: 'Ana', amount: 5000, description: null, date: '2026-03-03', paid: false, created_at: '' },
  ]);
});

describe('getMonthlyOverview', () => {
  it('totals spend and budget across categories', async () => {
    const o = await getMonthlyOverview('2026-03');
    expect(o.totalSpent).toBe(340000);
    expect(o.totalBudget).toBe(880000);
  });

  it('takes previous-month spend from the trend data', async () => {
    const o = await getMonthlyOverview('2026-03');
    expect(o.prevMonth).toBe('2026-02');
    expect(o.prevSpent).toBe(280000);
  });

  it('ranks top categories by spend, excluding zero-spend ones', async () => {
    const o = await getMonthlyOverview('2026-03');
    expect(o.topCategories).toEqual([
      { category: 'Comida', amount: 250000 },
      { category: 'Transporte', amount: 90000 },
    ]);
  });

  it('builds a 6-month trend, oldest first, defaulting missing months to 0', async () => {
    const o = await getMonthlyOverview('2026-03');
    expect(o.trend.map((p) => p.month)).toEqual([
      '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
    ]);
    expect(o.trend[2].total).toBe(0);
    expect(o.trend[5].total).toBe(340000);
  });

  it('splits debt totals into owed-to-me and I-owe', async () => {
    const o = await getMonthlyOverview('2026-03');
    expect(o.debtOwedToMe).toBe(20000);
    expect(o.debtIOwe).toBe(8000);
  });

  it('requests the trend for the 6 months ending at the requested month', async () => {
    await getMonthlyOverview('2026-03');
    expect(mockSpentByMonths).toHaveBeenCalledWith([
      '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
    ]);
  });
});
