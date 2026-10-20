/**
 * Variables d'environnement publiques (préfixe EXPO_PUBLIC_ obligatoire).
 * Copie `.env.example` en `.env` et remplis les clés Supabase.
 * Sans clés, l'app tourne en MODE DÉMO (données locales).
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** API de contenu du site (guides, parcours, chiffres). Surchargeable pour tester un site local. */
  contentUrl: (process.env.EXPO_PUBLIC_CONTENT_URL ?? 'https://dalili.study/api/content/v1').replace(/\/$/, ''),
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
