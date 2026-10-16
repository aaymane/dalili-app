import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Glow } from '@/components/brand/Glow';
import { gradients } from '@/theme/tokens';

function Orb({ size, x, y, color, delay }: { size: number; x: number; y: number; color: string; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => {
      t.set(withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true));
    }, delay);
    return () => clearTimeout(id);
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.6 + t.value * 0.4,
    transform: [{ translateX: t.value * 18 }, { translateY: t.value * -22 }, { scale: 1 + t.value * 0.12 }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2 }, style]}>
      <Glow size={size * 2} color={color} />
    </Animated.View>
  );
}

/** Fond nuit bleu profond + orbes lumineux qui respirent (welcome, onboarding, chargement). */
export function NightBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradients.night} style={StyleSheet.absoluteFill} />
      <Orb size={130} x={250} y={110} color="#5B78FF" delay={0} />
      <Orb size={170} x={-60} y={430} color="#3D78FF" delay={900} />
      <Orb size={120} x={210} y={640} color="#7A5AF8" delay={1600} />
    </View>
  );
}
