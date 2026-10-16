import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppleIcon, GoogleIcon } from '@/components/brand/BrandIcons';
import { LogoMark } from '@/components/brand/Logo';
import { toast } from '@/components/feedback/Toast';
import { NightBackground } from '@/components/layout/NightBackground';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { isDemoMode, useAuth } from '@/features/auth/store';
import { palette } from '@/theme/tokens';

/** Écran d'accueil : Google, Apple ou email. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const signInWithProvider = useAuth((s) => s.signInWithProvider);
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);

  const provider = async (p: 'google' | 'apple') => {
    setLoading(p);
    const res = await signInWithProvider(p);
    setLoading(null);
    if (!res.ok) toast(res.error, 'info');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <NightBackground />
      <View style={styles.hero}>
        <Animated.View entering={FadeInUp.duration(700).springify().damping(14)} style={{ alignItems: 'center' }}>
          <LogoMark size={86} color={palette.electricLight} />
          <Text variant="h1" color="#fff" style={styles.wordmark}>
            DALILI
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <Text variant="hero" color="#fff" align="center">
            Bienvenue dans{'\n'}
            <Text variant="hero" color="#5B8BFF">
              ton arrivée.
            </Text>
          </Text>
          <Text variant="body" color="rgba(255,255,255,0.7)" align="center" style={{ marginTop: 12, paddingHorizontal: 24 }}>
            Mentors, hôtes, IA — tout pour t’aider à poser tes valises en France.
          </Text>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <Animated.View entering={FadeInDown.delay(380).springify()}>
          <Button
            label="Continuer avec Google"
            variant="glass"
            iconLeft={<GoogleIcon />}
            loading={loading === 'google'}
            onPress={() => provider('google')}
          />
        </Animated.View>
        {Platform.OS !== 'android' && (
          <Animated.View entering={FadeInDown.delay(460).springify()}>
            <Button label="Continuer avec Apple" variant="white" iconLeft={<AppleIcon />} loading={loading === 'apple'} onPress={() => provider('apple')} />
          </Animated.View>
        )}
        <Animated.View entering={FadeInDown.delay(540).springify()} style={styles.or}>
          <View style={styles.line} />
          <Text variant="caption" color="rgba(255,255,255,0.5)">
            OU
          </Text>
          <View style={styles.line} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <Button label="Créer mon compte par email" icon={<ArrowRight size={18} color="#fff" />} onPress={() => router.push('/(auth)/register')} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(680)}>
          <PressableScale onPress={() => router.push('/(auth)/login')} style={{ alignSelf: 'center', padding: 12 }}>
            <Text variant="small" color="rgba(255,255,255,0.65)">
              Déjà membre ?{' '}
              <Text variant="smallStrong" color="#7FA6FF">
                Se connecter
              </Text>
            </Text>
          </PressableScale>
        </Animated.View>
        {isDemoMode && (
          <Text variant="caption" color="rgba(255,255,255,0.4)" align="center">
            Mode démo — aucune clé Supabase configurée
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 },
  wordmark: { fontFamily: 'Montserrat_900Black', letterSpacing: 2, marginTop: 10, fontSize: 26 },
  actions: { gap: 12, width: '100%', maxWidth: 460, alignSelf: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
});
