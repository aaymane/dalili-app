import { router } from 'expo-router';
import { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { useMentors } from '@/data/hooks';
import { useJourney, type JourneyItem } from '@/features/journey/store';
import { displayName, useProfile } from '@/features/profile/store';
import { daysFromToday } from '@/lib/date';
import { motion } from '@/theme/tokens';

/** Entrée en cascade plafonnée (DIRECTION.md §3) — respecte la réduction des animations. */
export const enter = (i: number) =>
  FadeInDown.delay(Math.min(i, motion.staggerMax) * motion.stagger)
    .springify()
    .damping(motion.springSoft.damping)
    .stiffness(motion.springSoft.stiffness)
    .reduceMotion(ReduceMotion.System);

/** « 1 étape », « 4 étapes ». */
export const steps = (n: number) => `${n} étape${n > 1 ? 's' : ''}`;

export const itemTitle = (i: JourneyItem) => (i.kind === 'official' ? i.step.title : i.custom.title);

export function openItem(i: JourneyItem) {
  if (i.kind === 'official') router.push({ pathname: '/(app)/etape/[id]', params: { id: i.step.id } });
  else router.push('/(app)/parcours');
}

/** Données communes aux 3 pistes d'accueil (mêmes sources que StudentHome). */
export function useHomeData() {
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const { data: mentors = [] } = useMentors();
  const city = profile.destinationCity;
  const guides = [...mentors].sort((a, b) => Number(b.city === city) - Number(a.city === city) || b.rating - a.rating);
  return {
    j,
    name: displayName(profile),
    /** « , Aymen » ou rien si le prénom n'est pas encore renseigné. */
    hello: profile.firstName.trim() ? `, ${profile.firstName.trim()}` : '',
    from: profile.originCity || 'Chez toi',
    to: city || 'la France',
    days: Math.max(0, daysFromToday(j.arrival)),
    next: j.upcoming.filter((u) => !u.current).slice(0, 3),
    guides,
  };
}
