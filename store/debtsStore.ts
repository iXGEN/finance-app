import { create } from 'zustand';
import { Debt, DebtInsert } from '../types';
import { getDebts, addDebt, markDebtPaid, deleteDebt } from '../services/debts';

interface DebtsState {
  debts: Debt[];
  loading: boolean;
  fetchDebts: () => Promise<void>;
  addDebt: (debt: DebtInsert) => Promise<Debt>;
  markPaid: (id: string) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
}

export const useDebtsStore = create<DebtsState>((set, get) => ({
  debts: [],
  loading: false,

  fetchDebts: async () => {
    set({ loading: true });
    try {
      const data = await getDebts();
      set({ debts: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addDebt: async (debt) => {
    const newDebt = await addDebt(debt);
    set((state) => ({ debts: [newDebt, ...state.debts] }));
    return newDebt;
  },

  markPaid: async (id) => {
    await markDebtPaid(id);
    set((state) => ({ debts: state.debts.filter((d) => d.id !== id) }));
  },

  deleteDebt: async (id) => {
    await deleteDebt(id);
    set((state) => ({ debts: state.debts.filter((d) => d.id !== id) }));
  },
}));
