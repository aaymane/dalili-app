import { t } from '@/i18n';
import { useLocalDb } from '@/data/local-db';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { fetchJourney } from '@/features/journey/api';
import { useJourneyStore } from '@/features/journey/store';
import { fetchProfile, restoreAvatar, syncProfile } from '@/features/profile/api';
import { clearLocalAvatars } from '@/features/profile/avatar';
import { useProfile } from '@/features/profile/store';

/**
 * Efface les données gardées sur le téléphone : profil, photo, parcours, communauté locale.
 * Appelée quand un AUTRE compte se connecte, pour qu'il n'hérite pas des données du précédent.
 */
export function resetLocalData() {
  useJourneyStore.getState().reset();
  useLocalDb.getState().reset();
  useProfile.getState().reset();
  clearLocalAvatars();
}

/**
 * Nouveau téléphone ou reconnexion : remet le profil, le parcours et la photo enregistrés en ligne,
 * pour ne pas refaire l'onboarding. Sans réseau, on n'attend pas plus de 8 s : l'onboarding s'affiche.
 */
export async function restoreFromServer() {
  const pull = Promise.all([fetchProfile(), fetchJourney()]).then(([saved, journey]) => {
    if (journey) useJourneyStore.setState(journey);
    if (!saved) return;
    // Une valeur vide en ligne n'efface jamais celle du téléphone (prénom saisi à l'inscription, par exemple).
    const filled = Object.fromEntries(Object.entries(saved.profile).filter(([, v]) => v !== '' && v != null));
    useProfile.setState((s) => ({ profile: { ...s.profile, ...filled }, onboardingDone: true }));
    // La photo arrive après coup : l'accueil s'affiche sans l'attendre.
    if (saved.avatarPath)
      restoreAvatar(saved.avatarPath)
        .then((uri) => uri && useProfile.getState().update({ avatarUri: uri }))
        .catch(() => {});
  });
  await Promise.race([pull.catch(() => {}), new Promise((r) => setTimeout(r, 8000))]);
}

/** Envoie chaque changement du profil après l'onboarding (ville, rôle, Profil IA…), groupés par 1,5 s. */
export function watchProfile() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = useProfile.subscribe((s, prev) => {
    // Fin d'onboarding (loading.tsx l'envoie) ou profil remis depuis le serveur : rien à renvoyer.
    if (!s.onboardingDone || !prev.onboardingDone || s.profile === prev.profile) return;
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
