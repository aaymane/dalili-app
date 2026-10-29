import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { motion, radius } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accent?: string;
  /** « pills » = pastilles séparées (Mes étapes / Calendrier), « track » = rail gris (Homme/Femme/Autre). */
  kind?: 'pills' | 'track';
};

/** Contrôle segmenté avec curseur qui glisse (ressort). */
export function Segmented<T extends string>({ options, value, onChange, accent, kind = 'pills' }: Props<T>) {
  const { c, shadow } = useTheme();
  const styles = useStyles();
  accent ??= c.electric;
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const seg = w / options.length;
  const thumb = useAnimatedStyle(() => ({
    width: seg - 8,
    transform: [{ translateX: withSpring(idx * seg + 4, motion.spring) }],
  }));

  if (kind === 'pills') {
    return (
      <View style={styles.pillsRow}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <PressableScale
              key={o.value}
              haptic="select"
              onPress={() => onChange(o.value)}
              style={[styles.pill, active ? { backgroundColor: accent, ...shadow.glow, shadowColor: accent } : styles.pillIdle]}>
              <Text variant="smallStrong" color={active ? c.white : c.navy}>
                {o.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && <Animated.View style={[styles.thumb, thumb]} />}
      {options.map((o) => (
        <PressableScale
          key={o.value}
          haptic={false}
          scaleTo={0.98}
          onPress={() => {
            haptics.select();
            onChange(o.value);
          }}
          style={styles.trackItem}>
          <Text variant="smallStrong" color={o.value === value ? c.navy : c.subtle}>
            {o.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  pillsRow: { flexDirection: 'row', gap: 10 },
  pill: { paddingHorizontal: 20, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pillIdle: { backgroundColor: c.card, ...shadow.sm },
  track: { flexDirection: 'row', backgroundColor: c.fill, borderRadius: radius.lg, height: 48, alignItems: 'center' },
  thumb: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: radius.md, backgroundColor: c.card, ...shadow.sm },
  trackItem: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
}));
