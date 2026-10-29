import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { LogoMark } from '@/components/brand/Logo';
import { toast } from '@/components/feedback/Toast';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { isDemoMode, useAuth } from '@/features/auth/store';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { pop, rise } from '@/theme/motion';

const LEN = 6;

/** Vérification de l'email par code à 6 chiffres. */
export default function Verify() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const verifyOtp = useAuth((s) => s.verifyOtp);
  const resendOtp = useAuth((s) => s.resendOtp);
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(42);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const submit = async (value = code) => {
    if (value.length !== LEN) return;
    setLoading(true);
    const res = await verifyOtp(email, value);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      haptics.warning();
      shake.set(withSequence(...[10, -10, 7, -7, 0].map((v) => withTiming(v, { duration: 55 }))));
      return;
    }
    haptics.success();
  };

  const resend = async () => {
    const res = await resendOtp(email);
    if (res.ok) {
      setSeconds(42);
      toast('Le code a été renvoyé à ton adresse e-mail.');
    } else toast(res.error, 'info');
  };

  return (
    <Screen
      top={gradients.sky}
      bg="#fff"
      keyboard
      footer={<Button label="Vérifier" icon={<Check size={18} color="#fff" strokeWidth={3} />} loading={loading} disabled={code.length !== LEN} onPress={() => submit()} />}>
      <View style={styles.wrap}>
        <Animated.View entering={pop()}>
          <LogoMark size={110} />
        </Animated.View>
        <Animated.View entering={rise(120)} style={{ alignItems: 'center', gap: 8 }}>
          <Text variant="hero" align="center">
            Vérifions que c’est{'\n'}bien toi.
          </Text>
          <Text variant="body" color={c.subtle} align="center">
            Code envoyé à <Text variant="bodyStrong">{email}</Text>
          </Text>
        </Animated.View>

        <Animated.View entering={rise(220)} style={[styles.boxes, shakeStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => input.current?.focus()} />
          {Array.from({ length: LEN }, (_, i) => {
            const ch = code[i];
            const active = i === code.length;
            return (
              <View key={i} pointerEvents="none" style={[styles.box, active && styles.boxActive, ch && styles.boxFilled, error && { borderColor: c.danger }]}>
                {ch ? (
                  <Animated.View entering={pop()}>
                    <Text variant="h1">{ch}</Text>
                  </Animated.View>
                ) : active ? (
                  <View style={styles.caret} />
                ) : null}
              </View>
            );
          })}
          <TextInput
            ref={input}
            value={code}
            onChangeText={(t) => {
              const v = t.replace(/\D/g, '').slice(0, LEN);
              setError(null);
              setCode(v);
              if (v.length > code.length) haptics.select();
              if (v.length === LEN) submit(v);
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            maxLength={LEN}
            style={styles.hidden}
          />
        </Animated.View>
        {error ? (
          <Text variant="small" color={c.danger}>
            {error}
          </Text>
        ) : null}

        <PressableScale disabled={seconds > 0} onPress={resend}>
          <Text variant="small" color={c.muted}>
            Pas reçu ?{' '}
            <Text variant="smallStrong" color={c.electric}>
              {seconds > 0 ? `Renvoyer dans 0:${String(seconds).padStart(2, '0')}` : 'Renvoyer le code'}
            </Text>
          </Text>
        </PressableScale>
        {isDemoMode ? (
          <Text variant="caption" color={c.muted} align="center">
            Mode démo : tape n’importe quel code à 6 chiffres.
          </Text>
        ) : null}
        <PressableScale onPress={() => router.back()}>
          <Text variant="smallStrong" color={c.subtle}>
            Modifier mon email
          </Text>
        </PressableScale>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  wrap: { alignItems: 'center', gap: 22, paddingTop: 40 },
  boxes: { flexDirection: 'row', gap: 9, marginTop: 8 },
  box: { width: 46, height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: c.electric, borderWidth: 2 },
  boxFilled: { borderColor: c.electricLight, backgroundColor: c.cardSelected },
  caret: { width: 2, height: 24, backgroundColor: c.electric, borderRadius: 1 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
}));
