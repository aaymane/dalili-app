import { useLocalDb } from '@/data/local-db';
import { useJourneyStore } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';

/**
 * Efface les données gardées sur le téléphone : profil, parcours, communauté locale.
 * Appelée quand un AUTRE compte se connecte, pour qu'il n'hérite pas des données du précédent.
 */
export function resetLocalData() {
  useJourneyStore.getState().reset();
  useLocalDb.getState().reset();
  useProfile.getState().reset();
}
