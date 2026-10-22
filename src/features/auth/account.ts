import { useLocalDb } from '@/data/local-db';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useJourneyStore } from '@/features/journey/store';
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
 * Supprime le compte en ligne : photos, fiche mentor, parcours, messages… (route /api/v1/account du site,
 * seule à pouvoir effacer un compte). Renvoie un message d'erreur, ou null si c'est fait.
 */
export async function deleteOnlineAccount(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return 'Session expirée. Reconnecte-toi, puis réessaie.';
  try {
    const res = await fetch(`${env.siteUrl}/api/v1/account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) return 'Session expirée. Reconnecte-toi, puis réessaie.';
    if (!res.ok) return 'Suppression impossible pour le moment. Réessaie dans quelques minutes.';
    return null;
  } catch {
    return 'Connexion impossible. Vérifie ta connexion internet.';
  }
}
