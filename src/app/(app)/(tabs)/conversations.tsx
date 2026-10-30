import { Redirect } from 'expo-router';

import { MessagesScreen } from '@/features/messages/components/MessagesScreen';
import { useProfile } from '@/features/profile/store';

/** Onglet Messages de l'espace mentor (l'étudiant ouvre ses messages depuis l'en-tête). */
export default function Conversations() {
  const role = useProfile((s) => s.profile.activeRole);
  if (role !== 'mentor') return <Redirect href="/(app)/messages" />;
  return <MessagesScreen tab />;
}
