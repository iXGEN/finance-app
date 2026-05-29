import { create } from 'zustand';
import { Transaction } from '../types';
import { getTransactions, addTransaction, deleteTransaction } from '../services/transactions';

interface TransactionsState {
  transactions: Transaction[];
  selectedMonth: string;
  loading: boolean;
  error: string | null;
  setSelectedMonth: (month: string) => void;
  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: Parameters<typeof addTransaction>[0]) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function currentMonth(): string {
  return new Date().toISOString().substring(0, 7);
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  selectedMonth: currentMonth(),
  loading: false,
  error: null,

  setSelectedMonth: (month) => {
    set({ selectedMonth: month });
    get().fetchTransactions();
  },

  fetchTransactions: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getTransactions(get().selectedMonth);
      set({ transactions: data, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  addTransaction: async (tx) => {
    const newTx = await addTransaction(tx);
    set((state) => ({ transactions: [newTx, ...state.transactions] }));
    return newTx;
  },

  deleteTransaction: async (id) => {
    await deleteTransaction(id);
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
  },

  refresh: async () => {
    await get().fetchTransactions();
  },
}));
