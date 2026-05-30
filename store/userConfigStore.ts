import { create } from 'zustand';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/categories';
import { getUserConfig, saveUserConfig } from '../services/userConfig';

interface UserConfigState {
  categories: string[];
  paymentMethods: string[];
  loaded: boolean;
  fetch: () => Promise<void>;
  addCategory: (cat: string) => Promise<void>;
  removeCategory: (cat: string) => Promise<void>;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  reorderCategories: (newOrder: string[]) => Promise<void>;
  addPaymentMethod: (method: string) => Promise<void>;
  removePaymentMethod: (method: string) => Promise<void>;
  renamePaymentMethod: (oldName: string, newName: string) => Promise<void>;
  reorderPaymentMethods: (newOrder: string[]) => Promise<void>;
}

export const useUserConfigStore = create<UserConfigState>((set, get) => ({
  categories: [...CATEGORIES],
  paymentMethods: [...PAYMENT_METHODS],
  loaded: false,

  fetch: async () => {
    try {
      const config = await getUserConfig();
      set({ categories: config.categories, paymentMethods: config.payment_methods, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  addCategory: async (cat) => {
    const categories = [...get().categories, cat];
    set({ categories });
    await saveUserConfig(categories, get().paymentMethods);
  },

  removeCategory: async (cat) => {
    const categories = get().categories.filter((c) => c !== cat);
    set({ categories });
    await saveUserConfig(categories, get().paymentMethods);
  },

  renameCategory: async (oldName, newName) => {
    const categories = get().categories.map((c) => (c === oldName ? newName : c));
    set({ categories });
    await saveUserConfig(categories, get().paymentMethods);
  },

  reorderCategories: async (newOrder) => {
    set({ categories: newOrder });
    await saveUserConfig(newOrder, get().paymentMethods);
  },

  addPaymentMethod: async (method) => {
    const paymentMethods = [...get().paymentMethods, method];
    set({ paymentMethods });
    await saveUserConfig(get().categories, paymentMethods);
  },

  removePaymentMethod: async (method) => {
    const paymentMethods = get().paymentMethods.filter((m) => m !== method);
    set({ paymentMethods });
    await saveUserConfig(get().categories, paymentMethods);
  },

  renamePaymentMethod: async (oldName, newName) => {
    const paymentMethods = get().paymentMethods.map((m) => (m === oldName ? newName : m));
    set({ paymentMethods });
    await saveUserConfig(get().categories, paymentMethods);
  },

  reorderPaymentMethods: async (newOrder) => {
    set({ paymentMethods: newOrder });
    await saveUserConfig(get().categories, newOrder);
  },
}));
