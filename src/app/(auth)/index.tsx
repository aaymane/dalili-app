import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppleIcon, GoogleIcon } from '@/components/brand/BrandIcons';
import { LogoMark } from '@/components/brand/Logo';
import { toast } from '@/components/feedback/Toast';
import { NightBackground } from '@/components/layout/NightBackground';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { FlyingMark, INTRO, MarkSlot, SplashCover, useLaunchIntro, Wordmark } from '@/features/auth/components/LaunchIntro';
import { isDemoMode, useAuth } from '@/features/auth/store';import { useT } from '@/i18n';

import { useTheme } from '@/theme/scheme';
import { rise } from '@/theme/motion';

const MARK = 86;

/** Écran d'accueil : Google, Apple ou email. Au lancement, il prend le relais de l'écran natif (LaunchIntro). */
export default function Welcome() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const signInWithProvider = useAuth((s) => s.signInWithProvider);
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const t = useT();
  const play = useLaunchIntro();
  const [slot, setSlot] = useState<{ x: number; y: number } | null>(null);
  // Au lancement, le contenu attend que le logo soit posé ; sinon, cascade habituelle.
  const at = (ms: number, intro: number) => rise(play ? INTRO.content + intro : ms);

  const provider = async (p: 'google' | 'apple') => {
    setLoading(p);
    const res = await signInWithProvider(p);
    setLoading(null);
    if (!res.ok) toast(res.error, 'info');
  };

  return (
    <View style={styles.fill}>
      <NightBackground ignite={play} />
      {play && <SplashCover />}
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}>
        <View style={styles.hero}>
          {play ? (
            <View style={{ alignItems: 'center' }}>
              <MarkSlot size={MARK} onMeasure={setSlot} />
              <Wordmark play style={styles.wordmark} />
            </View>
          ) : (
            <Animated.View entering={rise()} style={{ alignItems: 'center' }}>
              <LogoMark size={MARK} color={c.electricLight} />
              <Wordmark play={false} style={styles.wordmark} />
            </Animated.View>
          )}
          <Animated.View entering={at(200, 0)}>
            <Text variant="hero" color="#fff" align="center">
              {t('auth.welcomeA')}
              {'\n'}
              <Text variant="hero" color="#5B8BFF">
                {t('auth.welcomeB')}
              </Text>
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.7)" align="center" style={{ marginTop: 12, paddingHorizontal: 24 }}>
              {t('auth.tagline')}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.actions}>
          <Animated.View entering={at(380, 120)}>
            <Button
              label={t('auth.google')}
              variant="glass"
              iconLeft={<GoogleIcon />}
              loading={loading === 'google'}
              onPress={() => provider('google')}
            />
          </Animated.View>
          {Platform.OS !== 'android' && (
            <Animated.View entering={at(460, 180)}>
              <Button
                label={t('auth.apple')}
                variant="white"
                iconLeft={<AppleIcon />}
                loading={loading === 'apple'}
                onPress={() => provider('apple')}
              />
            </Animated.View>
          )}
          <Animated.View entering={at(540, 240)} style={styles.or}>
            <View style={styles.line} />
            <Text variant="caption" color="rgba(255,255,255,0.5)">
              {t('auth.or')}
            </Text>
            <View style={styles.line} />
          </Animated.View>
          <Animated.View entering={at(600, 280)}>
            <Button label={t('auth.emailSignup')} icon={<ArrowRight size={18} color="#fff" />} onPress={() => router.push('/(auth)/register')} />
          </Animated.View>
          <Animated.View entering={at(680, 320)}>
            <PressableScale onPress={() => router.push('/(auth)/login')} style={{ alignSelf: 'center', padding: 12 }}>
              <Text variant="small" color="rgba(255,255,255,0.65)">
                {t('auth.alreadyMember')}{' '}
                <Text variant="smallStrong" color="#7FA6FF">
                  {t('auth.signIn')}
                </Text>
              </Text>
            </PressableScale>
          </Animated.View>
          {isDemoMode && (
            <Text variant="caption" color="rgba(255,255,255,0.4)" align="center">
              {t('auth.demoMode')}
            </Text>
          )}
        </View>
      </View>
      {play && <FlyingMark size={MARK} target={slot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, paddingHorizontal: 22 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 },
  wordmark: {
    fontFamily: 'Montserrat_900Black',
    letterSpacing: 2,
    marginTop: 10,
    fontSize: 26,
  },
  actions: { gap: 12, width: '100%', maxWidth: 460, alignSelf: 'center' },
  or: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
});
