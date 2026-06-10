import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '../services/i18n';

interface LocaleState {
  locale: Locale;
  /** True once the persisted choice has been read back from storage. */
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
}

// The language is a per-device preference, so it lives in AsyncStorage rather than
// the Supabase user_config (which holds shared account data like categories).
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'es', // app is Spanish-first; English is opt-in via Settings
      hydrated: false,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'app-locale',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ locale: s.locale }),
      // Flip `hydrated` once the stored choice has loaded, so the UI can avoid a
      // flash of the default language on cold start.
      onRehydrateStorage: () => () => useLocaleStore.setState({ hydrated: true }),
    },
  ),
);
