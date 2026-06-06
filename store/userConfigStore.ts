import { create } from 'zustand';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/categories';
import { getUserConfig, saveUserConfig } from '../services/userConfig';

interface UserConfigState {
  categories: string[];
  paymentMethods: string[];
  persons: string[];
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
  addPerson: (name: string) => Promise<void>;
  removePerson: (name: string) => Promise<void>;
}

export const useUserConfigStore = create<UserConfigState>((set, get) => ({
  categories: [...CATEGORIES],
  paymentMethods: [...PAYMENT_METHODS],
  persons: [],
  loaded: false,

  fetch: async () => {
    try {
      const config = await getUserConfig();
      set({ categories: config.categories, paymentMethods: config.payment_methods, persons: config.persons, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  addCategory: async (cat) => {
    const categories = [...get().categories, cat];
    set({ categories });
    await saveUserConfig(categories, get().paymentMethods, get().persons);
  },

  removeCategory: async (cat) => {
    const categories = get().categories.filter((c) => c !== cat);
    set({ categories });
    await saveUserConfig(categories, get().paymentMethods, get().persons);
  },

  renameCategory: async (oldName, newName) => {
    const categories = get().categories.map((c) => (c === oldName ? newName : c));
    set({ categories });
    await saveUserConfig(categories, get().paymentMethods, get().persons);
  },

  reorderCategories: async (newOrder) => {
    set({ categories: newOrder });
    await saveUserConfig(newOrder, get().paymentMethods, get().persons);
  },

  addPaymentMethod: async (method) => {
    const paymentMethods = [...get().paymentMethods, method];
    set({ paymentMethods });
    await saveUserConfig(get().categories, paymentMethods, get().persons);
  },

  removePaymentMethod: async (method) => {
    const paymentMethods = get().paymentMethods.filter((m) => m !== method);
    set({ paymentMethods });
    await saveUserConfig(get().categories, paymentMethods, get().persons);
  },

  renamePaymentMethod: async (oldName, newName) => {
    const paymentMethods = get().paymentMethods.map((m) => (m === oldName ? newName : m));
    set({ paymentMethods });
    await saveUserConfig(get().categories, paymentMethods, get().persons);
  },

  reorderPaymentMethods: async (newOrder) => {
    set({ paymentMethods: newOrder });
    await saveUserConfig(get().categories, newOrder, get().persons);
  },

  addPerson: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const already = get().persons.some((p) => p.toLowerCase() === trimmed.toLowerCase());
    if (already) return;
    const persons = [...get().persons, trimmed];
    set({ persons });
    await saveUserConfig(get().categories, get().paymentMethods, persons);
  },

  removePerson: async (name) => {
    const persons = get().persons.filter((p) => p !== name);
    set({ persons });
    await saveUserConfig(get().categories, get().paymentMethods, persons);
  },
}));
