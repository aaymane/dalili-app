import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/store';
import { useJourneyStore } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { emptyProfile, type Profile } from '@/features/profile/types';
import { addDays, toISODate } from '@/lib/date';

/**
 * ⚠️ Écran TEMPORAIRE, mode développement uniquement : charge un profil de test pour les captures.
 * /dev-profil?p=aymen → Casablanca → Paris, rien commencé.
 * /dev-profil?p=salma → Alger → Lyon, visa obtenu, logement trouvé, arrivée dans 12 jours.
 * À supprimer au début de M1 (avec /ame-lab).
 */
const PROFILES: Record<string, { profile: Partial<Profile>; done: string[] }> = {
  aymen: {
    profile: {
      firstName: 'Aymen',
      lastName: 'B.',
      email: 'aymen@demo.dalili.study',
      country: 'MA',
      originCity: 'Casablanca',
      situation: 'abroad',
      studyLevel: 'bac',
      campusStatus: 'not_started',
      destinationCity: 'Paris',
      arrivalDate: null,
      housing: 'none',
      concerns: ['language', 'visa'],
    },
    done: [],
  },
  salma: {
    profile: {
      firstName: 'Salma',
      lastName: 'K.',
      email: 'salma@demo.dalili.study',
      country: 'DZ',
      originCity: 'Alger',
      situation: 'abroad',
      studyLevel: 'master',
      campusStatus: 'accepted',
      destinationCity: 'Lyon',
      arrivalDate: toISODate(addDays(new Date(), 12)),
      housing: 'found',
      concerns: ['money', 'loneliness'],
    },
    done: ['ressources', 'visa'],
  },
};

export default function DevProfil() {
  const { p } = useLocalSearchParams<{ p?: string }>();
  useEffect(() => {
    const preset = PROFILES[p ?? 'aymen'];
    if (!__DEV__ || !preset) return;
    useProfile.setState({ profile: { ...emptyProfile, ...preset.profile }, onboardingDone: true });
    useJourneyStore.getState().reset();
    preset.done.forEach((id) => useJourneyStore.getState().toggle(id, true));
    const user = { id: `demo-${p}`, email: preset.profile.email ?? '' };
    useAuth.setState({ demoUser: user, user, status: 'signedIn' });
    setTimeout(() => router.replace('/(app)/(tabs)'), 50);
  }, [p]);
  if (!__DEV__) return <Redirect href="/" />;
  return null;
}
