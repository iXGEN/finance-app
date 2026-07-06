// Client-side filtering for the expenses list. Pure logic, kept out of the UI layer
// so it can be unit-tested.

import { Transaction } from '../types';

export interface TransactionFilterState {
  text: string;
  category: string | null;
  onlyFixed: boolean;
}

export const EMPTY_FILTERS: TransactionFilterState = { text: '', category: null, onlyFixed: false };

export function hasActiveFilters(f: TransactionFilterState): boolean {
  return f.text.trim() !== '' || f.category !== null || f.onlyFixed;
}

export function applyFilters(txs: Transaction[], f: TransactionFilterState): Transaction[] {
  const q = f.text.trim().toLowerCase();
  return txs.filter((t) => {
    if (f.category && t.category !== f.category) return false;
    if (f.onlyFixed && !t.is_fixed) return false;
    if (q) {
      const hay = [t.category, t.description, t.payment_method, t.notes, String(t.amount)]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
