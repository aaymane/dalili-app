import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedReaction, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useReveal } from '@/components/motion/Reveal';
import { EASE_OUT } from '@/theme/motion';

import { Text } from './Text';

const ACircle = Animated.createAnimatedComponent(Circle);

type Props = {
  progress: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  colorTo?: string;
  track?: string;
  textColor?: string;
  label?: string;
};

/** Anneau de progression animé (accueil, profil). */
export function ProgressRing({
  progress,
  size = 64,
  stroke = 6,
  color = '#3D78FF',
  colorTo = '#7FA6FF',
  track = 'rgba(255,255,255,0.14)',
  textColor = '#fff',
  label,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  const target = useSharedValue(Math.max(0, Math.min(1, progress)));
  const reveal = useReveal();
  const reduced = useReducedMotion();
  useEffect(() => {
    target.set(Math.max(0, Math.min(1, progress)));
  }, [progress, target]);
  // Se remplit quand sa section apparaît (sinon dès l'affichage), puis suit la progression.
  useAnimatedReaction(
    () => (reveal && reveal.get() < 0.3 ? -1 : target.get()),
    (v, prev) => {
      if (v < 0 || v === prev) return;
      p.set(reduced ? v : withDelay(prev === null || prev < 0 ? 150 : 0, withTiming(v, { duration: 1100, easing: EASE_OUT })));
    },
  );
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colorTo} />
            <Stop offset="1" stopColor={color} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <Text variant="h3" color={textColor} style={{ fontSize: size * 0.24 }}>
        {label ?? `${Math.round(progress * 100)}%`}
      </Text>
    </View>
  );
}
