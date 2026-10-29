import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';

/** « 92,4 % » → 92.4, 1 décimale, suffixe « % » ; « 1 080 » → 1080. Ce qui ne se lit pas reste tel quel. */
function parse(value: string) {
  const m = value.match(/^(\d{1,3}(?:[\s ]\d{3})+|\d+)(?:,(\d+))?(.*)$/);
  if (!m) return null;
  const whole = Number(m[1].replace(/[\s ]/g, ''));
  const decimals = m[2]?.length ?? 0;
  return { target: whole + (decimals ? Number(`0.${m[2]}`) : 0), decimals, suffix: m[3] };
}

const format = (n: number, decimals: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).replace(/ /g, ' ');

/**
 * Un chiffre qui monte de 0 à sa valeur (≈ 1,2 s, sortie douce), une seule fois.
 * Animations réduites : la valeur s'affiche directement.
 */
export function CountUp({ value, delay = 0, style, color, variant = 'h1' }: { value: string; delay?: number; style?: StyleProp<TextStyle>; color?: string; variant?: 'hero' | 'h1' }) {
  const reduced = useReducedMotion();
  const parsed = parse(value);
  const [shown, setShown] = useState(reduced || !parsed ? value : format(0, parsed.decimals) + parsed.suffix);

  useEffect(() => {
    if (reduced || !parsed) return;
    let frame = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / 1200));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(format(parsed.target * eased, parsed.decimals) + parsed.suffix);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // La valeur ne change pas pendant la vie du compteur : on anime une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced, delay]);

  return (
    <Text variant={variant} color={color} style={[{ fontVariant: ['tabular-nums'] }, style]} accessibilityLabel={value}>
      {shown}
    </Text>
  );
}

/**
 * Photo « cinéma » : un lent zoom (1,12 → 1) et une légère dérive pendant `duration`.
 * Animations réduites : la photo reste fixe.
 */
export function KenBurns({ uri, duration = 6000, drift = 1 }: { uri: string; duration?: number; drift?: 1 | -1 }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    p.set(withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, [p, duration, reduced]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1.12 - 0.12 * p.value }, { translateX: drift * (10 - 20 * p.value) }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} accessibilityIgnoresInvertColors />
    </Animated.View>
  );
}
