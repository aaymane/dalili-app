import { router } from 'expo-router';
import { GraduationCap, Home, LifeBuoy } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen } from '@/components/layout/Screen';
import { StepHeader } from '@/components/layout/StepHeader';
import { Button } from '@/components/ui/Button';
import { ArrowRight, ChevronRight } from '@/components/ui/DirIcons';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { CityPicker } from '@/features/profile/components/CityPicker';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { leave, rise } from '@/theme/motion';

/** Parcours « Je vis déjà en France » : ville → comment aider (Mentor / Hôte / j'ai besoin d'aide). */
export default function MentorSetup() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const [i, setI] = useState(0);
  const t = useT();

  return (
    <Screen
      top={i === 0 ? gradients.mint : gradients.lilac}
      bg="#fff"
      padded={false}
      header={
        <StepHeader
          animKey={i}
          overline={t('onboarding.step', { n: i + 1, total: 3 })}
          title={i === 0 ? t('onboarding.mentor.cityTitle') : t('onboarding.mentor.helpTitle')}
          subtitle={i === 0 ? t('onboarding.mentor.cityText') : t('onboarding.mentor.helpText')}
          step={i}
          total={3}
          accent={c.mentor}
          onBack={() => (i ? setI(0) : router.back())}
        />
      }
      footer={i === 0 ? <Button label={t('common.continue')} accent={gradients.mentor} icon={<ArrowRight size={18} color="#fff" />} disabled={!profile.mentorCity} onPress={() => setI(1)} /> : undefined}>
      <Animated.View key={i} entering={rise(80)} exiting={leave} style={{ paddingHorizontal: 20, gap: 14 }}>
        {i === 0 ? (
          <CityPicker allowUnknown={false} value={profile.mentorCity} onChange={(c) => update({ mentorCity: c, destinationCity: c })} />
        ) : (
          <>
            <Animated.View entering={rise(80)}>
              <PressableScale
                haptic="press"
                onPress={() => {
                  update({ roles: ['mentor', 'student'], activeRole: 'mentor' });
                  // La charte d'abord : c'est elle qui envoie la fiche à l'équipe.
                  router.push('/(onboarding)/charte');
                }}
                style={[styles.choice, { backgroundColor: c.electricSoft }]}>
                <IconTile icon={GraduationCap} tone="blue" size={56} radius={18} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="h3" color={c.electric}>
                    {t('onboarding.mentor.become')}
                  </Text>
                  <Text variant="small" color={c.subtle}>
                    {t('onboarding.mentor.becomeText')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Tag label={t('onboarding.mentor.tagVisa')} />
                    <Tag label={t('onboarding.mentor.tagHousing')} />
                    <Tag label={t('onboarding.mentor.tagCv')} />
                  </View>
                </View>
                <ChevronRight size={18} color={c.electric} />
              </PressableScale>
            </Animated.View>
            <Animated.View entering={rise(160)}>
              <View style={[styles.choice, { backgroundColor: c.hostSoft, opacity: 0.85 }]}>
                <IconTile icon={Home} tone="orange" size={56} radius={18} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="h3" color={c.host}>
                    {t('onboarding.mentor.host')}
                  </Text>
                  <Text variant="small" color={c.subtle}>
                    {t('onboarding.mentor.hostSoon')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <Tag label={t('onboarding.mentor.tagStay')} color="#0F7A55" bg="#C9EEDD" />
                    <Tag label={t('onboarding.mentor.tagWelcome')} color="#0F7A55" bg="#C9EEDD" />
                  </View>
                </View>
              </View>
            </Animated.View>
            <Animated.View entering={rise(240)}>
              <PressableScale
                onPress={() => {
                  update({ roles: ['student'], activeRole: 'student', destinationCity: profile.mentorCity });
                  router.push('/(onboarding)/student-setup');
                }}
                style={styles.help}>
                <LifeBuoy size={18} color={c.electric} />
                <Text variant="smallStrong" color={c.electric} style={{ flex: 1 }}>
                  {t('onboarding.mentor.needHelp')}
                </Text>
                <ChevronRight size={16} color={c.electric} />
              </PressableScale>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

const useStyles = makeStyles(({ shadow, c }) => ({
  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.xl, ...shadow.sm },
  help: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.electricSoft, borderStyle: 'dashed' },
}));
