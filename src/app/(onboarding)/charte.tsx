import { router } from 'expo-router';

import { CharterScreen } from '@/features/mentors/components/CharterScreen';

/** Onboarding Mentor, dernière étape : la charte, puis la fiche part à l'équipe. */
export default function OnboardingCharter() {
  return (
    <CharterScreen
      step={2}
      total={3}
      onBack={() => router.back()}
      onDone={() => router.replace({ pathname: '/(onboarding)/loading', params: { role: 'mentor' } })}
    />
  );
}
