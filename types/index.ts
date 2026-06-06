export interface Transaction {
  id: string;
  user_id: string;
  date: string;       // YYYY-MM-DD
  category: string;
  description: string | null;
  amount: number;     // CLP integer
  payment_method: string | null;
  is_fixed: boolean;
  notes: string | null;
  week: number | null;
  registered: boolean;
  month: string;      // YYYY-MM
  created_at: string;
}

export type TransactionInsert = Omit<Transaction, 'id' | 'user_id' | 'created_at'>;

export interface BudgetConfig {
  id: string;
  user_id: string;
  month: string;
  category: string;
  budget: number;
}

export interface BudgetSummaryItem {
  category: string;
  budget: number;
  spent: number;
}

export interface Debt {
  id: string;
  user_id: string;
  person: string;
  amount: number; // positive = they owe you, negative = you owe them
  description: string | null;
  date: string;
  paid: boolean;
  created_at: string;
}

export type DebtInsert = Omit<Debt, 'id' | 'user_id' | 'created_at'>;

export interface SplitEntry {
  name: string;
  amount: number;
  debtId: string;
}

export interface SplitData {
  _s: 1;
  participants: SplitEntry[];
  total: number;
  notes: string;
}

export function parseSplit(notes: string | null | undefined): SplitData | null {
  if (!notes) return null;
  try {
    const d = JSON.parse(notes);
    return d._s === 1 ? (d as SplitData) : null;
  } catch {
    return null;
  }
}

export function encodeSplit(participants: SplitEntry[], total: number, userNotes: string): string {
  return JSON.stringify({ _s: 1, participants, total, notes: userNotes } satisfies SplitData);
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
}
