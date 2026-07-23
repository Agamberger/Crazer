import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
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

/**
 * Adapter de stockage hybride (Mobile + Web) pour éviter l'erreur Native module null d'AsyncStorage sur Web.
 */
const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignorer les erreurs de stockage local
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignorer les erreurs de suppression
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
