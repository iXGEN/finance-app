import { supabase } from './supabase';
import { BudgetConfig, BudgetSummaryItem } from '../types';
import { getSpentByCategory } from './transactions';

export async function getBudgetConfigs(month: string): Promise<BudgetConfig[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('budget_config')
    .select('*')
    .eq('month', month)
    .eq('user_id', user.id);

  if (error) throw error;
  return data ?? [];
}

export async function upsertBudget(month: string, category: string, budget: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('budget_config')
    .upsert({ user_id: user.id, month, category, budget }, { onConflict: 'user_id,month,category' });

  if (error) throw error;
}

/**
 * Re-points budget rows from an old category name to a new one. Respects the
 * unique (user_id, month, category) constraint: for any month that already has a
 * budget under the new name, the stale old-name row is dropped instead of renamed.
 */
export async function migrateBudgetCategoryName(oldName: string, newName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existingNew, error: e1 } = await supabase
    .from('budget_config')
    .select('month')
    .eq('user_id', user.id)
    .eq('category', newName);
  if (e1) throw e1;
  const takenMonths = new Set((existingNew ?? []).map((r) => r.month));

  const { data: oldRows, error: e2 } = await supabase
    .from('budget_config')
    .select('id, month')
    .eq('user_id', user.id)
    .eq('category', oldName);
  if (e2) throw e2;

  const toRename = (oldRows ?? []).filter((r) => !takenMonths.has(r.month)).map((r) => r.id);
  const toDelete = (oldRows ?? []).filter((r) => takenMonths.has(r.month)).map((r) => r.id);

  if (toRename.length) {
    const { error } = await supabase.from('budget_config').update({ category: newName }).in('id', toRename);
    if (error) throw error;
  }
  if (toDelete.length) {
    const { error } = await supabase.from('budget_config').delete().in('id', toDelete);
    if (error) throw error;
  }
}

/**
 * Copies every budget from `fromMonth` into `toMonth`, skipping categories that
 * already have a budget set in the target month. Returns how many were copied.
 */
export async function copyBudget(fromMonth: string, toMonth: string): Promise<number> {
  const [fromConfigs, toConfigs] = await Promise.all([
    getBudgetConfigs(fromMonth),
    getBudgetConfigs(toMonth),
  ]);
  const taken = new Set(toConfigs.filter((c) => c.budget > 0).map((c) => c.category));

  let copied = 0;
  for (const c of fromConfigs) {
    if (c.budget <= 0 || taken.has(c.category)) continue;
    await upsertBudget(toMonth, c.category, c.budget);
    copied++;
  }
  return copied;
}

export async function getBudgetSummary(month: string, userCategories: string[] = []): Promise<BudgetSummaryItem[]> {
  const [configs, spent] = await Promise.all([
    getBudgetConfigs(month),
    getSpentByCategory(month),
  ]);

  const budgetMap: Record<string, number> = {};
  for (const config of configs) {
    budgetMap[config.category] = config.budget;
  }

  const allCategories = new Set([
    ...userCategories,
    ...Object.keys(spent),
    ...Object.keys(budgetMap),
  ]);

  const categoryOrder = new Map(userCategories.map((c, i) => [c, i]));

  return Array.from(allCategories)
    .map((category) => ({
      category,
      budget: budgetMap[category] ?? 0,
      spent: spent[category] ?? 0,
    }))
    .sort((a, b) => {
      const hasActivityA = a.budget > 0 || a.spent > 0;
      const hasActivityB = b.budget > 0 || b.spent > 0;
      if (hasActivityA !== hasActivityB) return hasActivityA ? -1 : 1;
      if (a.spent !== b.spent) return b.spent - a.spent;
      const orderA = categoryOrder.get(a.category) ?? 999;
      const orderB = categoryOrder.get(b.category) ?? 999;
      return orderA - orderB;
    });
}
