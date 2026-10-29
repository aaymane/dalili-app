/**
 * Statistiques anonymes (PostHog, serveur européen) pour savoir ce qui aide vraiment : quelles étapes bloquent,
 * combien d'étudiants finissent l'onboarding, demandent un appel, s'intéressent à une école.
 *
 * Règles (RGPD) :
 * - rien n'est envoyé sans l'accord de l'utilisateur (carte sur l'accueil, interrupteur dans Confidentialité) ;
 * - jamais de nom, d'email, d'identifiant de compte, de message ni de question posée à Dalili IA ;
 * - seulement le rôle actif et le pays (Maroc, Algérie, Tunisie) comme contexte ;
 * - sans clé PostHog (`EXPO_PUBLIC_POSTHOG_KEY`), tout est sans effet et la carte ne s'affiche pas.
 */
import PostHog from 'posthog-react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { env } from './env';
import { persistStorage } from './storage';

/** Les seuls événements que l'app envoie, et leurs propriétés (jamais de texte libre). */
export type AnalyticsEvents = {
  onboarding_completed: { role: 'student' | 'mentor' };
  step_toggled: { step: string; done: boolean };
  guide_opened: { slug: string };
  ai_question_asked: Record<string, never>;
  mentor_request_sent: Record<string, never>;
  mentor_request_answered: { accepted: boolean };
  message_sent: { as_role: 'student' | 'mentor' };
  call_joined: { as_role: 'student' | 'mentor' };
  school_viewed: { school: string };
  school_story_opened: { school: string };
  school_story_finished: { school: string };
  school_interest_sent: { school: string; with_program: boolean };
  safety_report_sent: Record<string, never>;
};

export const analyticsAvailable = Boolean(env.posthogKey);

let client: PostHog | null = null;
function ph() {
  if (!analyticsAvailable) return null;
  client ??= new PostHog(env.posthogKey, {
    host: env.posthogHost,
    // Rien ne part avant le « oui ».
    defaultOptIn: false,
    // Pas de profil de personne : des événements anonymes, jamais reliés à un compte.
    personProfiles: 'never',
    captureAppLifecycleEvents: true,
    disabled: __DEV__ && !process.env.EXPO_PUBLIC_POSTHOG_IN_DEV,
  });
  return client;
}

type Consent = 'unknown' | 'yes' | 'no';

/** L'accord de l'utilisateur, gardé sur le téléphone. */
export const useAnalyticsConsent = create<{ consent: Consent; setConsent: (c: Exclude<Consent, 'unknown'>) => void }>()(
  persist(
    (set) => ({
      consent: 'unknown',
      setConsent: (consent) => {
        set({ consent });
        const c = ph();
        if (!c) return;
        void (consent === 'yes' ? c.optIn() : c.optOut());
      },
    }),
    { name: 'dalili.analytics-consent', storage: persistStorage },
  ),
);

const allowed = () => useAnalyticsConsent.getState().consent === 'yes';

/** Un événement de la liste, seulement si l'utilisateur a dit oui. */
export function track<E extends keyof AnalyticsEvents>(event: E, ...props: AnalyticsEvents[E] extends Record<string, never> ? [] : [AnalyticsEvents[E]]) {
  const c = ph();
  if (!c || !allowed()) return;
  c.capture(event, props[0] as Record<string, string | boolean> | undefined);
}

/**
 * Un écran, par son modèle de route (« messages/[id] »), jamais par ses identifiants.
 * Les groupes d'Expo Router (« (app) », « (tabs) ») ne comptent pas.
 */
export function trackScreen(segments: string[]) {
  const c = ph();
  if (!c || !allowed()) return;
  const name = segments.filter((s) => !s.startsWith('(')).join('/') || 'accueil';
  c.screen(name);
}

/** Contexte joint à chaque événement : le rôle actif et le pays, rien d'autre. */
export function setAnalyticsContext(role: 'student' | 'mentor' | 'host', country: string | null) {
  const c = ph();
  if (!c || !allowed()) return;
  void c.register({ role, country: country ?? 'inconnu' });
}
