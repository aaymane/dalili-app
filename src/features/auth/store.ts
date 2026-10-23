import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { isSupabaseConfigured } from '@/lib/env';
import { persistStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { unregisterPush } from '@/features/notifications/push';
import { useProfile } from '@/features/profile/store';

import { deleteOnlineAccount, resetLocalData, restoreFromServer, watchProfile } from './account';

WebBrowser.maybeCompleteAuthSession();

export type AuthUser = { id: string; email: string };
type Status = 'loading' | 'signedOut' | 'signedIn';
type Result = { ok: true; needsVerification?: boolean } | { ok: false; error: string };

type AuthState = {
  status: Status;
  user: AuthUser | null;
  /** Session de démo (aucune clé Supabase) — persistée localement. */
  demoUser: AuthUser | null;
  /** Compte à qui appartiennent les données gardées sur le téléphone (profil, parcours). */
  ownerId: string | null;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (email: string, password: string) => Promise<Result>;
  verifyOtp: (email: string, token: string) => Promise<Result>;
  resendOtp: (email: string) => Promise<Result>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<Result>;
  signOut: () => Promise<void>;
  /** Supprime définitivement le compte (en ligne puis sur le téléphone). */
  deleteAccount: () => Promise<Result>;
};

const frError = (message?: string) => {
  if (!message) return 'Une erreur est survenue. Réessaie.';
  if (/invalid login/i.test(message)) return 'Email ou mot de passe incorrect.';
  if (/already registered|already exists/i.test(message)) return 'Un compte existe déjà avec cet email.';
  if (/expired|invalid.*otp|token/i.test(message)) return 'Code invalide ou expiré.';
  if (/rate|too many/i.test(message)) return 'Trop de tentatives. Attends un instant.';
  if (/fetch|network|timeout/i.test(message)) return 'Connexion impossible. Vérifie ta connexion internet.';
  if (/not confirmed/i.test(message)) return 'Confirme d’abord ton email avec le code reçu.';
  return message;
};

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`;

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'loading',
      user: null,
      demoUser: null,
      ownerId: null,

      init: () => {
        if (!supabase) {
          const demo = get().demoUser;
          set({ status: demo ? 'signedIn' : 'signedOut', user: demo });
          return () => {};
        }
        // Un autre compte que le propriétaire des données locales : on efface AVANT d'afficher
        // quoi que ce soit, sinon il hériterait du profil et sauterait l'onboarding. Puis on remet
        // ce qu'il a enregistré en ligne (écran de chargement pendant ce temps).
        let restoring: Promise<void> | null = null;
        let latest = 0;
        const apply = async (u: { id: string; email?: string } | undefined) => {
          const call = ++latest;
          if (u && u.id !== get().ownerId) {
            // L'inscription vient de remplir prénom, pays… pour CE compte (même email) : on les garde,
            // sinon le profil en ligne n'aurait jamais de prénom. Rien d'un autre compte n'est conservé.
            const typed = useProfile.getState().profile;
            const sameAccount = !!u.email && typed.email.trim().toLowerCase() === u.email.trim().toLowerCase();
            const identity = sameAccount
              ? {
                  email: typed.email,
                  firstName: typed.firstName,
                  lastName: typed.lastName,
                  gender: typed.gender,
                  country: typed.country,
                  originCity: typed.originCity,
                  birthDate: typed.birthDate,
                }
              : null;
            resetLocalData();
            if (identity) useProfile.getState().update(identity);
            set({ ownerId: u.id, status: 'loading' });
            restoring = restoreFromServer();
          }
          if (u && restoring) await restoring;
          if (call !== latest) return; // un événement plus récent (déconnexion…) a déjà tranché
          set({ status: u ? 'signedIn' : 'signedOut', user: u ? { id: u.id, email: u.email ?? '' } : null });
        };
        supabase.auth.getSession().then(({ data }) => apply(data.session?.user));
        // Reporté au tour suivant : appeler supabase.auth dans ce rappel peut bloquer la session.
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          setTimeout(() => apply(session?.user), 0);
        });
        const stopWatching = watchProfile();
        return () => {
          data.subscription.unsubscribe();
          stopWatching();
        };
      },

      signIn: async (email, password) => {
        if (!supabase) {
          const user = { id: demoId(), email };
          set({ demoUser: user, user, status: 'signedIn' });
          return { ok: true };
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { ok: false, error: frError(error.message) } : { ok: true };
      },

      signUp: async (email, password) => {
        if (!supabase) return { ok: true, needsVerification: true };
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { ok: false, error: frError(error.message) };
        return { ok: true, needsVerification: !data.session };
      },

      verifyOtp: async (email, token) => {
        if (!supabase) {
          if (!/^\d{6}$/.test(token)) return { ok: false, error: 'Le code contient 6 chiffres.' };
          const user = { id: demoId(), email };
          set({ demoUser: user, user, status: 'signedIn' });
          return { ok: true };
        }
        const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
        return error ? { ok: false, error: frError(error.message) } : { ok: true };
      },

      resendOtp: async (email) => {
        if (!supabase) return { ok: true };
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        return error ? { ok: false, error: frError(error.message) } : { ok: true };
      },

      signInWithProvider: async (provider) => {
        if (!supabase) {
          const user = { id: demoId(), email: `${provider}@demo.dalili.study` };
          set({ demoUser: user, user, status: 'signedIn' });
          return { ok: true };
        }
        const redirectTo = Linking.createURL('auth/callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
        });
        if (error) return { ok: false, error: frError(error.message) };
        if (Platform.OS === 'web') return { ok: true };
        const res = await WebBrowser.openAuthSessionAsync(data.url ?? '', redirectTo);
        if (res.type !== 'success') return { ok: false, error: 'Connexion annulée.' };
        const { queryParams } = Linking.parse(res.url);
        const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
        if (!code) return { ok: false, error: 'Connexion impossible. Réessaie.' };
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        return exErr ? { ok: false, error: frError(exErr.message) } : { ok: true };
      },

      signOut: async () => {
        // Ce téléphone ne doit plus recevoir les alertes de ce compte.
        await unregisterPush().catch(() => {});
        if (supabase) await supabase.auth.signOut();
        set({ demoUser: null, user: null, status: 'signedOut' });
      },

      deleteAccount: async () => {
        if (supabase) {
          const error = await deleteOnlineAccount();
          if (error) return { ok: false, error };
          // Le compte n'existe plus : on ferme la session sur le téléphone, sans appeler le serveur.
          await supabase.auth.signOut({ scope: 'local' });
        }
        resetLocalData();
        set({ demoUser: null, user: null, ownerId: null, status: 'signedOut' });
        return { ok: true };
      },
    }),
    {
      name: 'dalili.auth',
      storage: persistStorage,
      partialize: (s) => ({ demoUser: s.demoUser, ownerId: s.ownerId }),
    },
  ),
);

export const isDemoMode = !isSupabaseConfigured;
