/**
 * Variables d'environnement publiques (préfixe EXPO_PUBLIC_ obligatoire).
 * Copie `.env.example` en `.env` et remplis les clés Supabase.
 * Sans clés, l'app tourne en MODE DÉMO (données locales).
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
