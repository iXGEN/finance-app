import { Transaction, parseSplit } from '../types';
import { getTransactions, addTransaction } from './transactions';
import { sameDayInMonth } from './dates';

export interface FixedCarryResult {
  created: number;
  skipped: number;
}

/** All fixed (recurring) expenses recorded in a given month. */
export async function getFixedExpenses(month: string): Promise<Transaction[]> {
  const txs = await getTransactions(month);
  return txs.filter((t) => t.is_fixed);
}

/** Stable identity for a fixed expense, used to avoid carrying the same one twice. */
function fixedKey(category: string, description: string | null, amount: number): string {
  return `${category}|${description ?? ''}|${amount}`;
}

/**
 * Regenerates the fixed expenses of `fromMonth` into `toMonth`. Idempotent: a fixed
 * expense already present in the target (same category + description + amount) is skipped.
 *
 * A split fixed expense is copied as a plain fixed expense for the user's own share
 * (its stored amount); it does NOT recreate the linked Saldos, to avoid phantom debts
 * appearing every month.
 */
export async function carryOverFixedExpenses(fromMonth: string, toMonth: string): Promise<FixedCarryResult> {
  const [fromFixed, existing] = await Promise.all([
    getFixedExpenses(fromMonth),
    getTransactions(toMonth),
  ]);

  const existingKeys = new Set(
    existing
      .filter((t) => t.is_fixed)
      .map((t) => fixedKey(t.category, t.description, t.amount)),
  );

  let created = 0;
  let skipped = 0;

  for (const t of fromFixed) {
    const split = parseSplit(t.notes);
    const notes = split ? (split.notes || null) : t.notes;
    const key = fixedKey(t.category, t.description, t.amount);

    if (existingKeys.has(key)) { skipped++; continue; }

    await addTransaction({
      date: sameDayInMonth(t.date, toMonth),
      category: t.category,
      description: t.description,
      amount: t.amount,
      payment_method: t.payment_method,
      is_fixed: true,
      notes,
      registered: false,
    });

    existingKeys.add(key);
    created++;
  }

  return { created, skipped };
}
