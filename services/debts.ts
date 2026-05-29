import { supabase } from './supabase';
import { Debt, DebtInsert } from '../types';

export async function getDebts(includePaid = false): Promise<Debt[]> {
  let query = supabase
    .from('debts')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includePaid) {
    query = query.eq('paid', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function addDebt(debt: DebtInsert): Promise<Debt> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('debts')
    .insert({ ...debt, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markDebtPaid(id: string): Promise<void> {
  const { error } = await supabase.from('debts').update({ paid: true }).eq('id', id);
  if (error) throw error;
}

export async function deleteDebt(id: string): Promise<void> {
  const { error } = await supabase.from('debts').delete().eq('id', id);
  if (error) throw error;
}
