import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/scheme';
import { type Tone } from '@/theme/tokens';

type Props = {
  /** Icône lucide dessinée en deux tons (trait foncé, remplissage clair) dans la couleur de `tone`. */
  icon?: LucideIcon;
  tone?: Tone;
  children?: ReactNode;
  size?: number;
  /** Ancien style : dégradé saturé avec une icône blanche (réservé aux cartes nuit et au bouton IA). */
  colors?: readonly [string, string];
  bg?: string;
  radius?: number;
};

/** Tuile d'icône : ton doux bicolore (par défaut), dégradé ou aplat. */
export function IconTile({ icon: Icon, tone = 'blue', children, size = 44, colors, bg, radius }: Props) {
  const { tones } = useTheme();
  const r = radius ?? size * 0.32;
  const box = { width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' } as const;
  if (colors) {
    return (
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={box}>
        {children}
      </LinearGradient>
    );
  }
  if (bg) return <View style={[box, { backgroundColor: bg }]}>{children}</View>;
  const t = tones[tone];
  return (
    <LinearGradient colors={[t.top, t.bg]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[box, styles.edge]}>
      {Icon ? <Icon size={Math.round(size * 0.56)} color={t.ink} fill={t.fill} strokeWidth={1.9} /> : children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Liseré clair en haut : la tuile a l'air posée, sans ombre.
  edge: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.9)' },
});
