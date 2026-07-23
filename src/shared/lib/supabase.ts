import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Database } from '@/shared/types';

// Extraction des variables d'environnement Expo
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[Supabase] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY non définies. Utilisation des valeurs par défaut (mode fallback).',
    );
  }
}

// Fallback mémoire si AsyncStorage natif n'est pas disponible (Web / Expo Go)
const memoryStorage = new Map<string, string>();

/**
 * Adapter de stockage hybride résilient (Mobile Native + Web + Fallback Mémoire)
 */
const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStorage.get(key) || null;
    }
    try {
      // Require dynamique pour éviter l'initialisation du module natif sur Web
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const val = await AsyncStorage.getItem(key);
      return val;
    } catch {
      return memoryStorage.get(key) || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStorage.set(key, value);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch {
      // Le fallback mémoire conserve déjà la valeur
    }
  },
  removeItem: async (key: string): Promise<void> => {
    memoryStorage.delete(key);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignorer
    }
  },
};

/**
 * Client Supabase singleton pour l'application Crazer.
 * Utilise l'adapter de stockage hybride pour la persistance de session d'authentification sur Mobile et Web.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: process.env.NODE_ENV !== 'test',
    persistSession: true,
    detectSessionInUrl: false,
  },
});
