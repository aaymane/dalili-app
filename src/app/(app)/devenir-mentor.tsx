import { router } from 'expo-router';
import { useState } from 'react';

import { AppHeader } from '@/components/layout/AppHeader';
import { SuccessModal } from '@/components/feedback/SuccessModal';
import { Screen } from '@/components/layout/Screen';
import { ApplyLocked, ApplyPending } from '@/features/mentors/components/ApplyStatus';
import { CharterScreen } from '@/features/mentors/components/CharterScreen';
import { DocumentsScreen } from '@/features/mentors/components/DocumentsScreen';
import { useMyApplication } from '@/features/mentors/hooks';
import { isInFrance, useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';

/**
 * Devenir mentor : seulement une fois en France. La charte, puis le titre de séjour et le certificat de scolarité ;
 * l'équipe vérifie, puis l'app bascule toute seule dans l'espace mentor (useMentorRoleSync).
 */
export default function DevenirMentor() {
  const t = useT();
  const profile = useProfile((s) => s.profile);
  const application = useMyApplication();
  const [step, setStep] = useState(0);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const status = application.data?.status;

  let screen;
  if (!isInFrance(profile)) screen = <ApplyLocked />;
  else if (application.isPending) screen = <Screen padded={false} header={<AppHeader back hideActions />}>{null}</Screen>;
  else if ((status === 'pending' || status === 'approved') && !sent) screen = <ApplyPending />;
  else if (step === 1 && birthYear)
    screen = <DocumentsScreen step={1} total={2} birthYear={birthYear} onBack={() => setStep(0)} onSent={() => setSent(true)} />;
  else
    screen = (
      <CharterScreen
        step={0}
        total={2}
        onBack={() => router.back()}
        onNext={(year) => {
          setBirthYear(year);
          setStep(1);
        }}
      />
    );

  return (
    <>
      {screen}
      <SuccessModal
        visible={sent}
        title={t('mentorApply.sentTitle')}
        message={t('mentorApply.sentText')}
        cta={t('common.continue')}
        onCta={() => setSent(false)}
        onClose={() => setSent(false)}
      />
    </>
  );
}
