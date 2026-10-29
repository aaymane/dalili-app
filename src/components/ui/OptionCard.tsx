import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { EASE_OUT } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { motion, radius } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  selected?: boolean;
  onPress: () => void;
  accent?: string;
  /** « radio » (rond à droite) ou « check » (multi-sélection). */
  kind?: 'radio' | 'check' | 'none';
  right?: ReactNode;
};

/** Carte d'option (questions d'onboarding) avec sélection animée. */
export function OptionCard({ title, subtitle, icon, selected, onPress, accent, kind = 'radio', right }: Props) {
  const { c } = useTheme();
  const styles = useStyles();
  accent ??= c.electric;
  const box = useAnimatedStyle(() => ({
    borderColor: withTiming(selected ? accent : c.line, { duration: 160 }),
    transform: [{ scale: withSpring(selected ? 1.01 : 1, motion.spring) }],
  }));
  // La coche se pose (fondu + 0,5 → 1), sans rebond : on choisit souvent, ça doit rester discret.
  const inner = useAnimatedStyle(() => ({
    opacity: withTiming(selected ? 1 : 0, { duration: 180, easing: EASE_OUT }),
    transform: [{ scale: withTiming(selected ? 1 : 0.5, { duration: 180, easing: EASE_OUT }) }],
  }));
  return (
    <PressableScale onPress={onPress} haptic="select" scaleTo={0.98}>
      <Animated.View style={[styles.card, box, selected && { backgroundColor: c.cardSelected }]}>
        {icon}
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{title}</Text>
          {subtitle ? (
            <Text variant="small" color={c.muted}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
        {kind !== 'none' && (
          <View style={[kind === 'radio' ? styles.radio : styles.checkbox, selected && { borderColor: accent }]}>
            <Animated.View style={[kind === 'radio' ? styles.radioIn : styles.checkIn, { backgroundColor: accent }, inner]} />
          </View>
        )}
      </Animated.View>
    </PressableScale>
  );
}

const useStyles = makeStyles(({ shadow, c }) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: c.card,
    borderWidth: 1.5,
    ...shadow.sm,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: c.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioIn: { width: 12, height: 12, borderRadius: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: c.lineStrong, alignItems: 'center', justifyContent: 'center' },
  checkIn: { width: 14, height: 14, borderRadius: 4 },
}));
