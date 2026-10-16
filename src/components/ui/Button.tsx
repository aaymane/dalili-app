import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, palette, radius, shadow } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'white' | 'glass' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'lg' | 'md' | 'sm';
  icon?: ReactNode;
  iconLeft?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  /** Couleur d'accent (rôle) — remplace le bleu électrique pour la variante primary. */
  accent?: readonly [string, string];
  style?: StyleProp<ViewStyle>;
  full?: boolean;
};

const heights = { lg: 56, md: 46, sm: 36 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconLeft,
  loading,
  disabled,
  accent,
  style,
  full = true,
}: Props) {
  const h = heights[size];
  const textColor =
    variant === 'secondary' || variant === 'white' ? palette.navy : variant === 'ghost' ? palette.electric : palette.white;

  const content = (
    <View style={[styles.inner, { height: h, paddingHorizontal: size === 'sm' ? 14 : 22 }]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {iconLeft}
          <Text variant="button" color={textColor} style={size === 'sm' && { fontSize: 13 }}>
            {label}
          </Text>
          {icon}
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic="press"
      accessibilityLabel={label}
      style={[full && { alignSelf: 'stretch' }, !full && { alignSelf: 'flex-start' }, style]}>
      {variant === 'primary' || variant === 'danger' ? (
        <LinearGradient
          colors={variant === 'danger' ? ['#F87171', '#E5484D'] : (accent ?? gradients.electric)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, { borderRadius: h / 2 }, !disabled && shadow.glow]}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.base,
            { borderRadius: h / 2 },
            variant === 'secondary' && styles.secondary,
            variant === 'white' && styles.white,
            variant === 'dark' && { backgroundColor: palette.navyInk },
            variant === 'glass' && styles.glass,
          ]}>
          {content}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  white: { backgroundColor: palette.white, ...shadow.sm },
  glass: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
});

export const radiusPill = radius.pill;
