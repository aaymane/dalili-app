import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View } from 'react-native';

type Props = { children: ReactNode; size?: number; colors?: readonly [string, string]; bg?: string; radius?: number };

/** Tuile d'icône (dégradé ou aplat doux). */
export function IconTile({ children, size = 44, colors, bg = '#E6EEFF', radius }: Props) {
  const r = radius ?? size * 0.32;
  if (colors) {
    return (
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </LinearGradient>
    );
  }
  return <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}
