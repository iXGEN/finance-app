import { supabase } from './supabase';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/categories';

interface UserConfig {
  categories: string[];
  payment_methods: string[];
  persons: string[];
}

const DEFAULTS: UserConfig = {
  categories: [...CATEGORIES],
  payment_methods: [...PAYMENT_METHODS],
  persons: [],
};

export async function getUserConfig(): Promise<UserConfig> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_config')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error?.code === 'PGRST116') return DEFAULTS;
  if (error) throw error;

  return {
    categories: data.categories?.length ? data.categories : DEFAULTS.categories,
    payment_methods: data.payment_methods?.length ? data.payment_methods : DEFAULTS.payment_methods,
    persons: (data as any).persons ?? [],
  };
}

export async function saveUserConfig(
  categories: string[],
  paymentMethods: string[],
  persons: string[],
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_config')
    .upsert({ user_id: user.id, categories, payment_methods: paymentMethods, persons });

  if (error) {
    // Fallback: column may not exist in DB yet — save without persons
    const { error: e2 } = await supabase
      .from('user_config')
      .upsert({ user_id: user.id, categories, payment_methods: paymentMethods });
    if (e2) throw e2;
  }
}
