import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { create } from 'zustand';

const COLORS = ['#014DF8', '#3D78FF', '#1FB17C', '#F59E0B', '#EA580C', '#7A5AF8', '#F43F5E', '#FFFFFF'];

const useConfetti = create<{ shot: number; fire: () => void }>((set) => ({
  shot: 0,
  fire: () => set((s) => ({ shot: s.shot + 1 })),
}));

/** Déclenche une pluie de confettis depuis n'importe où. */
export const celebrate = () => useConfetti.getState().fire();

function Piece({ seed, shot }: { seed: number; shot: number }) {
  const { width, height } = Dimensions.get('window');
  const cfg = useMemo(() => {
    const r = (n: number) => Math.abs(Math.sin(seed * 9301 + n * 49297 + shot * 233)) % 1;
    return {
      x: r(1) * width,
      drift: (r(2) - 0.5) * 160,
      delay: r(3) * 250,
      dur: 1600 + r(4) * 1200,
      rot: (r(5) - 0.5) * 900,
      size: 6 + r(6) * 7,
      color: COLORS[Math.floor(r(7) * COLORS.length)],
      round: r(8) > 0.6,
    };
  }, [seed, shot, width]);
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(0);
    t.set(withDelay(cfg.delay, withTiming(1, { duration: cfg.dur, easing: Easing.out(Easing.quad) })));
  }, [cfg, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - Math.max(0, (t.value - 0.75) * 4),
    transform: [
      { translateX: cfg.x + cfg.drift * t.value },
      { translateY: -40 + (height * 0.85) * t.value },
      { rotate: `${cfg.rot * t.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', top: 0, left: 0, width: cfg.size, height: cfg.round ? cfg.size : cfg.size * 1.8, backgroundColor: cfg.color, borderRadius: cfg.round ? cfg.size : 2 },
        style,
      ]}
    />
  );
}

/** Couche de confettis — montée une seule fois à la racine. */
export function ConfettiLayer() {
  const shot = useConfetti((s) => s.shot);
  if (!shot) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 46 }, (_, i) => (
        <Piece key={`${shot}-${i}`} seed={i + 1} shot={shot} />
      ))}
    </View>
  );
}
