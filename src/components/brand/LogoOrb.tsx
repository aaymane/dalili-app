import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Glow } from './Glow';
import { LogoMark } from './Logo';

/** Logo dans une sphère lumineuse qui respire (écrans sombres). */
export function LogoOrb({ size = 132, pulse = true }: { size?: number; pulse?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (pulse) t.value = withRepeat(withSequence(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) })), -1);
  }, [pulse, t]);
  const glow = useAnimatedStyle(() => ({ opacity: 0.45 + t.value * 0.35, transform: [{ scale: 1 + t.value * 0.08 }] }));
  const core = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * 0.02 }] }));
  return (
    <View style={{ width: size * 1.6, height: size * 1.6, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute' }, glow]}>
        <Glow size={size * 1.75} color="#3D78FF" opacity={0.75} />
      </Animated.View>
      <Animated.View style={core}>
        <LinearGradient
          colors={['#5B8BFF', '#1F56F5', '#0B3BC9']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
          <LogoMark size={size * 0.54} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}
