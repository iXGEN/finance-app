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

export async function getBudgetSummary(month: string, userCategories: string[]): Promise<BudgetSummaryItem[]> {
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
