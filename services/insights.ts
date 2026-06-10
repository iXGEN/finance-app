import { getSpentByMonths } from './transactions';
import { getBudgetSummary } from './budget';
import { getDebts } from './debts';
import { addMonths, lastMonthsUpTo } from './dates';
import { useUserConfigStore } from '../store/userConfigStore';

export interface CategorySpend {
  category: string;
  amount: number;
}

export interface MonthPoint {
  month: string;
  total: number;
}

export interface MonthlyOverview {
  month: string;
  totalSpent: number;
  totalBudget: number;
  prevMonth: string;
  prevSpent: number;
  topCategories: CategorySpend[]; // descending by amount, spend > 0 only
  trend: MonthPoint[]; // last 6 months including `month`, oldest first
  debtOwedToMe: number;
  debtIOwe: number;
}

const TREND_MONTHS = 6;

/** Aggregates everything the Resumen dashboard needs for a given month in one pass. */
export async function getMonthlyOverview(month: string): Promise<MonthlyOverview> {
  const prevMonth = addMonths(month, -1);
  const trendMonths = lastMonthsUpTo(month, TREND_MONTHS);
  const categories = useUserConfigStore.getState().categories;

  // `budgetSummary` already carries per-category spend, and the trend already covers
  // the previous month — so three queries cover everything the dashboard needs.
  const [budgetSummary, byMonth, debts] = await Promise.all([
    getBudgetSummary(month, categories),
    getSpentByMonths(trendMonths),
    getDebts(false),
  ]);

  const totalSpent = budgetSummary.reduce((s, i) => s + i.spent, 0);
  const totalBudget = budgetSummary.reduce((s, i) => s + i.budget, 0);
  const prevSpent = byMonth[prevMonth] ?? 0;

  const topCategories = budgetSummary
    .filter((i) => i.spent > 0)
    .map((i) => ({ category: i.category, amount: i.spent }))
    .sort((a, b) => b.amount - a.amount);

  const trend = trendMonths.map((m) => ({ month: m, total: byMonth[m] ?? 0 }));

  const debtOwedToMe = debts.filter((d) => d.amount > 0).reduce((s, d) => s + d.amount, 0);
  const debtIOwe = debts.filter((d) => d.amount < 0).reduce((s, d) => s + Math.abs(d.amount), 0);

  return {
    month,
    totalSpent,
    totalBudget,
    prevMonth,
    prevSpent,
    topCategories,
    trend,
    debtOwedToMe,
    debtIOwe,
  };
}
