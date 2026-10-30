import { Redirect } from 'expo-router';

import { MentorAgenda } from '@/features/mentors/components/MentorAgenda';
import { useProfile } from '@/features/profile/store';

/** Onglet Agenda de l'espace mentor : demandes à traiter, appels à venir, historique. */
export default function Agenda() {
  const role = useProfile((s) => s.profile.activeRole);
  if (role !== 'mentor') return <Redirect href="/(app)/rendez-vous" />;
  return <MentorAgenda />;
}
