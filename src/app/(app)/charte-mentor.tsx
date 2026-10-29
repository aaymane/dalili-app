import { router } from 'expo-router';

import { toast } from '@/components/feedback/Toast';
import { CharterScreen } from '@/features/mentors/components/CharterScreen';
import { useMyMentor } from '@/features/mentors/hooks';
import { t } from '@/i18n';

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
        toast(hasSheet ? t('mentors.charter.accepted') : t('mentors.charter.sent'));
        router.back();
      }}
    />
  );
}
