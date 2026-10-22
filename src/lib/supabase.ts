import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env, isSupabaseConfigured } from './env';
import { secureSessionStorage } from './secure-session';

/**
 * Client Supabase unique. `null` en mode démo (aucune clé configurée).
 * Toujours tester `if (!supabase)` avant usage, ou passer par les fonctions `api.ts` des features.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        // Sur le téléphone, la session est chiffrée (clé dans le trousseau). Sur le web, stockage du navigateur.
        storage: Platform.OS === 'web' ? AsyncStorage : secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    })
  : null;

// Rafraîchit le token seulement quand l'app est au premier plan (recommandation Supabase pour React Native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
