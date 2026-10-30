import { router } from 'expo-router';
import { Check, PlaneLanding, Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { isDemoMode } from '@/features/auth/store';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { enter, pop, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { useApproveDemo } from '../hooks';

/** Pas encore en France : on devient mentor une fois passé par là. « J'y suis déjà » met le profil à jour. */
export function ApplyLocked() {
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const update = useProfile((s) => s.update);
  return (
    <Screen top={gradients.mint} padded={false} header={<AppHeader back hideActions />}>
      <View style={styles.center}>
        <Animated.View entering={pop()}>
          <IconTile icon={PlaneLanding} tone="green" size={84} radius={28} />
        </Animated.View>
        <Animated.View entering={rise(80)} style={{ gap: 10 }}>
          <Text variant="hero" align="center">
            {t('mentorApply.lockedTitle')}
          </Text>
          <Text variant="body" color={c.subtle} align="center">
            {t('mentorApply.lockedText')}
          </Text>
        </Animated.View>
        <Animated.View entering={rise(160)} style={{ alignSelf: 'stretch', gap: 10 }}>
          <Button label={t('mentorApply.lockedArrived')} accent={gradients.mentor} onPress={() => update({ situation: 'in_france' })} />
          <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        </Animated.View>
      </View>
    </Screen>
  );
}

/** Point qui respire : la vérification est en cours (pas de rebond, une respiration lente). */
function Breathing({ color }: { color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: 1100 }), -1, true));
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + p.get() * 0.65, transform: [{ scale: 0.85 + p.get() * 0.25 }] }));
  return <Animated.View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }, style]} />;
}

/** Candidature envoyée : où on en est, en trois temps. En démo, on peut simuler la validation. */
export function ApplyPending() {
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const approve = useApproveDemo();
  const steps = [
    { label: t('mentorApply.pendingStep1'), state: 'done' as const },
    { label: t('mentorApply.pendingStep2'), state: 'active' as const },
    { label: t('mentorApply.pendingStep3'), state: 'idle' as const },
  ];
  return (
    <Screen top={gradients.mint} padded={false} header={<AppHeader back hideActions />}>
      <View style={{ paddingHorizontal: 20, gap: 20 }}>
        <Animated.View entering={enter(0)} style={{ gap: 8 }}>
          <Text variant="hero">{t('mentorApply.pendingTitle')}</Text>
          <Text variant="body" color={c.subtle}>
            {t('mentorApply.pendingText')}
          </Text>
        </Animated.View>
        <Animated.View entering={enter(1)} style={styles.card}>
          {steps.map((s, i) => (
            <View key={s.label} style={styles.step}>
              <View style={styles.rail}>
                <View style={[styles.dot, s.state === 'done' && { backgroundColor: c.mentor, borderColor: c.mentor }, s.state === 'active' && { borderColor: c.mentor }]}>
                  {s.state === 'done' ? (
                    <Animated.View entering={pop(200)}>
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </Animated.View>
                  ) : s.state === 'active' ? (
                    <Breathing color={c.mentor} />
                  ) : (
                    <Sparkles size={13} color={c.muted} />
                  )}
                </View>
                {i < steps.length - 1 ? <View style={[styles.line, s.state === 'done' && { backgroundColor: c.mentor }]} /> : null}
              </View>
              <Text variant={s.state === 'idle' ? 'body' : 'bodyStrong'} color={s.state === 'idle' ? c.muted : c.navy} style={{ flex: 1, paddingTop: 4 }}>
                {s.label}
              </Text>
            </View>
          ))}
        </Animated.View>
        {isDemoMode ? (
          <Animated.View entering={enter(2)} style={{ alignItems: 'center' }}>
            <PressableScale onPress={approve} style={styles.demo}>
              <Text variant="smallStrong" color={c.subtle}>
                {t('mentorApply.demoApprove')}
              </Text>
            </PressableScale>
          </Animated.View>
        ) : null}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  center: { flex: 1, alignItems: 'center', gap: 22, paddingHorizontal: 24, paddingTop: 40 },
  card: { padding: 18, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  step: { flexDirection: 'row', gap: 14 },
  rail: { alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
  line: { width: 2, height: 26, backgroundColor: c.line, marginVertical: 4 },
  demo: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: c.fill },
}));
