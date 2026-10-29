import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/store';
import { useJourneyStore } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { emptyProfile, type Profile } from '@/features/profile/types';
import { useLanguage, type LanguagePreference } from '@/i18n';
import { addDays, toISODate } from '@/lib/date';

/**
 * ⚠️ Écran TEMPORAIRE, mode développement uniquement : charge un profil de test pour les captures.
 * /dev-profil?p=aymen → Casablanca → Paris, rien commencé.
 * /dev-profil?p=salma → Alger → Lyon, visa obtenu, logement trouvé, arrivée dans 12 jours.
 * /dev-profil?p=aymen&onboarding=1 → même profil, mais ouvre le questionnaire d'onboarding.
 * /dev-profil?p=salma&role=mentor → même profil, en mode Mentor.
 * /dev-profil?p=salma&jours=0 → même profil, arrivée dans 0 jour (billet « Bienvenue à … »).
 * /dev-profil?p=salma&langue=ar → même profil, app en arabe (fr, ar, en ou system).
 * /dev-profil?p=aymen&faites=bourses,tcf → même profil, avec ces étapes en plus déjà faites.
 * /dev-profil?p=salma&deblocage=1 → même profil, et l'écran de déblocage du billet s'ouvre comme si le visa venait d'être coché.
 * Gardé pour les captures de chaque jalon (désactivé hors mode dev). À supprimer après M5.
 */
// `__DEV__` vaut false dans le build de production : le minifieur retire ces profils de test.
const PROFILES: Record<string, { profile: Partial<Profile>; done: string[] }> = !__DEV__
  ? {}
  : {
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
  const { p, onboarding, role, jours, deblocage, faites, langue } = useLocalSearchParams<{
    p?: string;
    onboarding?: string;
    role?: string;
    jours?: string;
    deblocage?: string;
    faites?: string;
    langue?: LanguagePreference;
  }>();
  useEffect(() => {
    const preset = PROFILES[p ?? 'aymen'];
    if (!__DEV__ || !preset) return;
    const mentor: Partial<Profile> = role === 'mentor' ? { roles: ['mentor', 'student'], activeRole: 'mentor', mentorCity: preset.profile.destinationCity ?? null } : {};
    const arrival: Partial<Profile> = jours != null ? { arrivalDate: toISODate(addDays(new Date(), Number(jours))) } : {};
    useProfile.setState({ profile: { ...emptyProfile, ...preset.profile, ...mentor, ...arrival }, onboardingDone: !onboarding });
    useJourneyStore.getState().reset();
    [...preset.done, ...(faites ? faites.split(',') : [])].forEach((id) => useJourneyStore.getState().toggle(id, true));
    // Le profil arrive avec son visa déjà validé : pas de déblocage, sauf si on veut le tester.
    if (!deblocage) useJourneyStore.getState().markTicketSeen();
    if (langue) useLanguage.getState().setPreference(langue);
    const user = { id: `demo-${p}`, email: preset.profile.email ?? '' };
    useAuth.setState({ demoUser: user, user, status: 'signedIn' });
    setTimeout(() => router.replace(onboarding ? '/(onboarding)' : '/(app)/(tabs)'), 50);
  }, [p, onboarding, role, jours, deblocage, faites, langue]);
  if (!__DEV__) return <Redirect href="/" />;
  return null;
}
