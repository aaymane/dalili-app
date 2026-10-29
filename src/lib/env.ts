/**
 * Variables d'environnement publiques (préfixe EXPO_PUBLIC_ obligatoire).
 * Copie `.env.example` en `.env` et remplis les clés Supabase.
 * Sans clés, l'app tourne en MODE DÉMO (données locales).
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** Le site dalili.study : source du contenu ET du cerveau de Dalili IA. Surchargeable pour tester un site local. */
  siteUrl: (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://dalili.study').replace(/\/$/, ''),
  /** Statistiques anonymes (PostHog, serveur européen). Sans clé, rien n'est envoyé et rien n'est demandé. */
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com').replace(/\/$/, ''),
  /** API de contenu du site (guides, parcours, chiffres). */
  get contentUrl() {
    return (process.env.EXPO_PUBLIC_CONTENT_URL ?? `${this.siteUrl}/api/content/v1`).replace(/\/$/, '');
  },
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
