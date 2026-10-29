import { useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoOrb } from '@/components/brand/LogoOrb';
import { celebrate } from '@/components/feedback/Confetti';
import { NightBackground } from '@/components/layout/NightBackground';
import { Text } from '@/components/ui/Text';
import { syncProfile } from '@/features/profile/api';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/scheme';
import { pop, rise } from '@/theme/motion';
import { track } from '@/lib/analytics';

/** « Je prépare ton arrivée à Paris… » — construction animée de l'espace perso. */
export default function Loading() {
  const { c } = useTheme();
  const { role = 'student' } = useLocalSearchParams<{ role: 'student' | 'mentor' }>();
  const insets = useSafeAreaInsets();
  const profile = useProfile((s) => s.profile);
  const complete = useProfile((s) => s.completeOnboarding);
  const [done, setDone] = useState(-1);
  const t = useT();

  const city = profile.destinationCity ?? profile.mentorCity;
  const title = role === 'mentor' ? t('onboarding.loading.titleMentor') : city ? t('onboarding.loading.titleCity', { city }) : t('onboarding.loading.title');
  const items =
    role === 'mentor'
      ? [t('onboarding.loading.mentor1'), t('onboarding.loading.mentor2', { city: city ?? t('onboarding.loading.yourCity') }), t('onboarding.loading.mentor3'), t('onboarding.loading.space')]
      : [t('onboarding.loading.student1'), t('onboarding.loading.student2'), t('onboarding.loading.student3'), t('onboarding.loading.space')];

  useEffect(() => {
    syncProfile(profile).catch(() => {});
    const timers = items.map((_, k) =>
      setTimeout(() => {
        setDone(k);
        haptics.select();
      }, 700 + k * 750),
    );
    const end = setTimeout(() => {
      haptics.success();
      celebrate();
      complete();
      track('onboarding_completed', { role: profile.activeRole === 'mentor' ? 'mentor' : 'student' });
    }, 700 + items.length * 750 + 500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}>
      <NightBackground />
      <View style={styles.hero}>
        <Animated.View entering={rise()}>
          <LogoOrb size={120} />
        </Animated.View>
        <Animated.View entering={rise(150)} style={{ alignItems: 'center', gap: 8 }}>
          <Text variant="overline" color="#7FA6FF">
            DALILI
          </Text>
          <Text variant="hero" color="#fff" align="center">
            {title}
          </Text>
        </Animated.View>
      </View>
      <View style={{ gap: 12, paddingHorizontal: 20, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        {items.map((label, k) => {
          const state = k <= done ? 'done' : k === done + 1 ? 'active' : 'idle';
          return (
            <Animated.View key={k} entering={rise(250 + k * 90)} style={[styles.row, state === 'active' && styles.rowActive]}>
              <View style={[styles.bullet, state === 'done' && { backgroundColor: c.success, borderColor: c.success }]}>
                {state === 'done' ? (
                  <Animated.View entering={pop()}>
                    <Check size={12} color="#fff" strokeWidth={3.5} />
                  </Animated.View>
                ) : state === 'active' ? (
                  <View style={styles.activeDot} />
                ) : null}
              </View>
              <Text variant="smallStrong" color={state === 'idle' ? 'rgba(255,255,255,0.4)' : '#fff'} style={{ flex: 1 }}>
                {label}
              </Text>
              {state === 'active' && <ActivityIndicator size="small" color="#7FA6FF" />}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, paddingHorizontal: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  rowActive: { borderColor: 'rgba(91,139,255,0.7)', backgroundColor: 'rgba(91,139,255,0.12)' },
  bullet: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7FA6FF' },
});
