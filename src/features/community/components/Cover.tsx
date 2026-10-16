import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';

/** Couverture illustrée (dégradé + emoji + halos) — remplace les photos tant qu'il n'y en a pas. */
export function Cover({ colors, emoji, height = 150, label, labelColor = '#3D78FF', children, radius = 22 }: { colors: readonly [string, string]; emoji: string; height?: number; label?: string; labelColor?: string; children?: ReactNode; radius?: number }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cover, { height, borderRadius: radius }]}>
      <View style={[styles.halo, { width: height * 1.2, height: height * 1.2, right: -height * 0.3, top: -height * 0.35 }]} />
      <View style={[styles.halo, { width: height * 0.7, height: height * 0.7, left: -height * 0.2, bottom: -height * 0.3, opacity: 0.08 }]} />
      <Text style={[styles.emoji, { fontSize: height * 0.48, lineHeight: height * 0.6, right: height * 0.12, bottom: height * 0.08 }]}>{emoji}</Text>
      {label ? (
        <View style={[styles.label, { backgroundColor: labelColor }]}>
          <Text variant="caption" color="#fff" style={{ fontSize: 9, letterSpacing: 0.6 }}>
            {label}
          </Text>
        </View>
      ) : null}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cover: { overflow: 'hidden', justifyContent: 'flex-end' },
  halo: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff', opacity: 0.12 },
  emoji: { position: 'absolute' },
  label: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
});
