import { create } from 'zustand';
import { BudgetSummaryItem } from '../types';
import { getBudgetSummary, upsertBudget } from '../services/budget';

interface BudgetState {
  summary: BudgetSummaryItem[];
  loading: boolean;
  fetchSummary: (month: string) => Promise<void>;
  upsertBudget: (month: string, category: string, budget: number) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  summary: [],
  loading: false,

  fetchSummary: async (month) => {
    set({ loading: true });
    try {
      const data = await getBudgetSummary(month);
      set({ summary: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  upsertBudget: async (month, category, budget) => {
    await upsertBudget(month, category, budget);
    const data = await getBudgetSummary(month);
    set({ summary: data });
  },
}));
