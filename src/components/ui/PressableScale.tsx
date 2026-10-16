import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { motion } from '@/theme/tokens';

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Échelle au toucher (0.96 par défaut). */
  scaleTo?: number;
  haptic?: 'tap' | 'press' | 'select' | false;
};

/** Pressable avec ressort + retour haptique : la base de tous les éléments cliquables. */
export function PressableScale({ style, scaleTo = 0.96, haptic = 'tap', onPressIn, onPressOut, onPress, disabled, ...rest }: Props) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <APressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, motion.spring);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, motion.springBouncy);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[style, aStyle, disabled && { opacity: 0.5 }]}
      {...rest}
    />
  );
}
