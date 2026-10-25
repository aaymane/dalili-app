import { router } from 'expo-router';

import { toast } from '@/components/feedback/Toast';
import { CharterScreen } from '@/features/mentors/components/CharterScreen';
import { useMyMentor } from '@/features/mentors/hooks';

/** Depuis l'espace Mentor : envoyer sa fiche, ou accepter la charte pour une fiche envoyée avant elle. */
export default function MentorCharter() {
  const hasSheet = !!useMyMentor().data;
  return (
    <CharterScreen
      step={0}
      total={1}
      hasSheet={hasSheet}
      onBack={() => router.back()}
      onDone={() => {
        toast(hasSheet ? 'Charte acceptée. Merci !' : 'Fiche envoyée. L’équipe la relit.');
        router.back();
      }}
    />
  );
}
