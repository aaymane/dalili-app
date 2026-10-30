import { t } from '@/i18n';
import { useLocalDb } from '@/data/local-db';
import { env } from '@/lib/env';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { fetchJourney, syncStep } from '@/features/journey/api';
import { cancelReminders } from '@/features/notifications/reminders';
import { useJourneyStore } from '@/features/journey/store';
import { fetchProfile, restoreAvatar, syncProfile } from '@/features/profile/api';
import { clearLocalAvatars } from '@/features/profile/avatar';
import { useProfile } from '@/features/profile/store';

import { mergeJourney, mergeProfile } from './merge';

/**
 * Efface les données gardées sur le téléphone : profil, photo, parcours, communauté locale, rappels planifiés.
 * Appelée quand un AUTRE compte se connecte, pour qu'il n'hérite pas des données du précédent.
 */
/**
 * Oublie ce que l'app a lu en ligne pour ce compte (fiche mentor, rendez-vous, messages…) : le compte suivant sur
 * ce téléphone ne doit jamais le voir, ni basculer en mentor à cause de lui. Le contenu du site reste en cache.
 */
export function forgetAccountQueries() {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'content' });
}

export function resetLocalData() {
  forgetAccountQueries();
  useJourneyStore.getState().reset();
  useLocalDb.getState().reset();
  useProfile.getState().reset();
  clearLocalAvatars();
  void cancelReminders();
}

/** Vrai pendant qu'on pose ce qui vient du serveur : `watchProfile` ne le renvoie pas. */
let fromServer = false;

/**
 * Relit le profil, les étapes cochées et les tâches perso enregistrés en ligne et les pose dans les stores :
 * le serveur gagne, sauf ce que l'étudiant touche pendant la relecture (voir merge.ts).
 * Renvoie vrai si un profil terminé existe en ligne.
 */
async function pullFromServer() {
  const before = { profile: useProfile.getState().profile, journey: useJourneyStore.getState() };
  const [saved, journey] = await Promise.all([fetchProfile(), fetchJourney()]);
  if (journey) {
    const merged = mergeJourney(before.journey, useJourneyStore.getState(), journey);
    useJourneyStore.setState({ overrides: merged.overrides, custom: merged.custom });
    // Cochées sur ce téléphone quand l'envoi avait échoué : on les renvoie maintenant.
    merged.toPush.forEach((id) => syncStep(id, merged.overrides[id]).catch(() => {}));
  }
  if (!saved) return false;
  fromServer = true;
  useProfile.setState((s) => ({ profile: mergeProfile(before.profile, s.profile, saved.profile), onboardingDone: true }));
  fromServer = false;
  // La photo arrive après coup : l'accueil s'affiche sans l'attendre. Déjà sur le téléphone : rien à télécharger.
  const current = useProfile.getState().profile.avatarUri;
  if (saved.avatarPath && !current?.endsWith(`/${saved.avatarPath.split('/').pop()}`))
    restoreAvatar(saved.avatarPath)
      .then((uri) => uri && useProfile.getState().update({ avatarUri: uri }))
      .catch(() => {});
  return true;
}

/**
 * Nouveau téléphone ou autre compte : remet ce qui est enregistré en ligne, pour ne pas refaire l'onboarding.
 * Sans réseau, on n'attend pas plus de 8 s : l'onboarding s'affiche.
 */
export async function restoreFromServer() {
  await Promise.race([pullFromServer().catch(() => {}), new Promise((r) => setTimeout(r, 8000))]);
}

/**
 * Même compte qu'avant (lancement de l'app, reconnexion) : l'app s'ouvre tout de suite avec ce que garde
 * le téléphone, puis se met à jour avec ce qui a changé ailleurs (autre téléphone, site). Sans réseau : rien ne bouge.
 */
export function refreshFromServer() {
  void pullFromServer().catch(() => {});
}

/** Envoie chaque changement du profil après l'onboarding (ville, rôle, Profil IA…), groupés par 1,5 s. */
export function watchProfile() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = useProfile.subscribe((s, prev) => {
    // Fin d'onboarding (loading.tsx l'envoie) ou profil remis depuis le serveur : rien à renvoyer.
    if (fromServer || !s.onboardingDone || !prev.onboardingDone || s.profile === prev.profile) return;
    clearTimeout(timer);
    timer = setTimeout(() => syncProfile(useProfile.getState().profile).catch(() => {}), 1500);
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

/**
 * Supprime le compte en ligne : photos, fiche mentor, parcours, messages… (route /api/v1/account du site,
 * seule à pouvoir effacer un compte). Renvoie un message d'erreur, ou null si c'est fait.
 */
export async function deleteOnlineAccount(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return t('auth.errors.sessionExpired');
  try {
    const res = await fetch(`${env.siteUrl}/api/v1/account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return t('auth.errors.sessionExpired');
    if (!res.ok) return t('auth.errors.deleteFailed');
    return null;
  } catch {
    return t('auth.errors.network');
  }
}
