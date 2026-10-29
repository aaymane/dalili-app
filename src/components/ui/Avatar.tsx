import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { makeStyles, useTheme } from '@/theme/scheme';

import { Text } from './Text';

type Props = { name: string; size?: number; color?: string; uri?: string | null; ring?: string; online?: boolean };

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
};

/** Avatar : photo si dispo, sinon initiales sur dégradé. */
export function Avatar({ name, size = 44, color, uri, ring, online }: Props) {
  const { c } = useTheme();
  const styles = useStyles();
  color ??= c.electricLight;
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: size / 2 },
          ring && { borderWidth: Math.max(2, size / 22), borderColor: ring },
        ]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient colors={[shade(color, 40), shade(color, -30)]} style={[StyleSheet.absoluteFill, styles.center]}>
            <Text variant="h3" color="#fff" style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>
              {initials || '·'}
            </Text>
          </LinearGradient>
        )}
      </View>
      {online && <View style={[styles.dot, { width: size / 4, height: size / 4, borderRadius: size / 8 }]} />}
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  wrap: { overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: 0, bottom: 0, backgroundColor: c.mentor, borderWidth: 2, borderColor: c.card },
}));
