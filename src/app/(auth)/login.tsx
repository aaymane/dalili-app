import { router } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/brand/Logo';
import { toast } from '@/components/feedback/Toast';
import { NightBackground } from '@/components/layout/NightBackground';
import { Button } from '@/components/ui/Button';
import { ArrowRight, ChevronLeft } from '@/components/ui/DirIcons';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/store';import { useT } from '@/i18n';

import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/scheme';
import { rise } from '@/theme/motion';

export default function Login() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t('auth.errors.invalidEmail'));
    if (password.length < 6) return setError(t('auth.errors.passwordShort'));
    setError(null);
    setLoading(true);
    const res = await signIn(email.trim(), password);
    setLoading(false);
    if (!res.ok) {
      haptics.warning();
      setError(res.error);
    }
  };

  const forgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t('auth.errors.emailForReset'));
    if (supabase) await supabase.auth.resetPasswordForEmail(email.trim());
    toast(t('auth.resetSent'), 'info');
  };

  return (
    <View style={{ flex: 1 }}>
      <NightBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <PressableScale onPress={() => router.back()} style={styles.back} accessibilityLabel={t('common.back')}>
            <ChevronLeft size={20} color="#fff" />
          </PressableScale>
          <Animated.View entering={rise()} style={styles.hero}>
            <LogoMark size={64} color={c.electricLight} />
            <Text variant="h1" color="#fff" style={{ fontFamily: 'Montserrat_900Black', letterSpacing: 2 }}>
              DALILI
            </Text>
            <Text variant="hero" color="#fff" align="center">
              {t('auth.welcomeA')}
              {'\n'}
              <Text variant="hero" color="#5B8BFF">
                {t('auth.welcomeB')}
              </Text>
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.65)" align="center">
              {t('auth.welcomeBack')}
            </Text>
          </Animated.View>
          <Animated.View entering={rise(150)} style={{ gap: 12 }}>
            <Input
              dark
              label={t('auth.email')}
              icon={<Mail size={16} color={c.electric} />}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Input
              dark
              label={t('auth.password')}
              icon={<Lock size={16} color={c.electric} />}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={submit}
              error={error}
            />
            <PressableScale onPress={forgot} style={{ alignSelf: 'flex-end', padding: 4 }}>
              <Text variant="smallStrong" color="#7FA6FF">
                {t('auth.forgot')}
              </Text>
            </PressableScale>
          </Animated.View>
          <View style={{ flex: 1, minHeight: 32 }} />
          <Animated.View entering={rise(260)} style={{ gap: 6 }}>
            <Button label={t('auth.signIn')} icon={<ArrowRight size={18} color="#fff" />} loading={loading} onPress={submit} />
            <PressableScale onPress={() => router.replace('/(auth)/register')} style={{ alignSelf: 'center', padding: 12 }}>
              <Text variant="small" color="rgba(255,255,255,0.65)">
                {t('auth.noAccount')}{' '}
                <Text variant="smallStrong" color="#7FA6FF">
                  {t('auth.signUp')}
                </Text>
              </Text>
            </PressableScale>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 22, maxWidth: 480, width: '100%', alignSelf: 'center' },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 32 },
});
