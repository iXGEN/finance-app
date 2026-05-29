import { supabase } from './supabase';
import { BudgetConfig, BudgetSummaryItem } from '../types';
import { getSpentByCategory } from './transactions';
import { CATEGORIES } from '../constants/categories';

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

export async function getBudgetSummary(month: string): Promise<BudgetSummaryItem[]> {
  const [configs, spent] = await Promise.all([
    getBudgetConfigs(month),
    getSpentByCategory(month),
  ]);

  const budgetMap: Record<string, number> = {};
  for (const config of configs) {
    budgetMap[config.category] = config.budget;
  }

  const allCategories = new Set([
    ...CATEGORIES,
    ...Object.keys(spent),
    ...Object.keys(budgetMap),
  ]);

  return Array.from(allCategories)
    .map((category) => ({
      category,
      budget: budgetMap[category] ?? 0,
      spent: spent[category] ?? 0,
    }))
    .filter((item) => item.budget > 0 || item.spent > 0)
    .sort((a, b) => b.spent - a.spent);
}
