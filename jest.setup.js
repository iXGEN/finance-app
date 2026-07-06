// AsyncStorage has no native module in the Jest environment; the package ships this mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// services/supabase.ts creates its client at import time; give it harmless values so
// suites that (auto)mock data services can still load the module graph. No network
// call happens at createClient time.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
