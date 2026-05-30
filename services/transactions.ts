import { supabase } from './supabase';
import { Transaction, TransactionInsert } from '../types';

function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
}

function getMonth(dateStr: string): string {
  return dateStr.substring(0, 7); // YYYY-MM
}

export async function getTransactions(month: string, category?: string): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('month', month)
    .order('date', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function addTransaction(tx: Omit<TransactionInsert, 'week' | 'month'>): Promise<Transaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const insert: TransactionInsert = {
    ...tx,
    month: getMonth(tx.date),
    week: getWeekNumber(tx.date),
    registered: tx.registered ?? false,
    is_fixed: tx.is_fixed ?? false,
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...insert, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, updates: Partial<TransactionInsert>): Promise<Transaction> {
  const payload: Partial<TransactionInsert> = { ...updates };
  if (updates.date) {
    payload.week = getWeekNumber(updates.date);
    payload.month = getMonth(updates.date);
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function getSpentByCategory(month: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('month', month);

  if (error) throw error;

  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    totals[row.category] = (totals[row.category] ?? 0) + row.amount;
  }
  return totals;
}
