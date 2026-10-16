import { Check } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { palette, radius } from '@/theme/tokens';

import { Text } from './Text';

/** Petit tag majuscule (ex. « VISA · VLS-TS »). */
export function Tag({ label, color = palette.electric, bg = palette.electricSoft, style }: { label: string; color?: string; bg?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
      <Text variant="caption" color={color} style={{ fontSize: 9.5, letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

type Status = 'done' | 'todo' | 'current' | 'late' | 'soon';

/** Pastille de statut d'une étape. */
export function StatusPill({ status, label }: { status: Status; label?: string }) {
  const map = {
    done: { bg: palette.successSoft, fg: palette.success, text: 'Fait' },
    todo: { bg: '#F1F3F9', fg: palette.muted, text: 'À venir' },
    current: { bg: palette.electric, fg: palette.white, text: 'À toi de jouer' },
    late: { bg: palette.dangerSoft, fg: palette.danger, text: 'En retard' },
    soon: { bg: palette.dangerSoft, fg: palette.danger, text: 'Bientôt' },
  }[status];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <Text variant="caption" color={map.fg}>
        {label ?? map.text}
      </Text>
      {(status === 'done' || status === 'todo') && <Check size={11} color={map.fg} strokeWidth={3} />}
    </View>
  );
}

/** Puce de filtre (ville, catégorie…). */
export function Chip({ label, count, active, color = palette.electric }: { label: string; count?: number; active?: boolean; color?: string }) {
  return (
    <View style={[styles.chip, active ? { backgroundColor: color, borderColor: color } : null]}>
      <Text variant="smallStrong" color={active ? palette.white : palette.navy}>
        {label}
      </Text>
      {count != null && (
        <View style={[styles.count, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text variant="caption" color={active ? palette.white : palette.subtle} style={{ fontSize: 10 }}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
  },
  count: { backgroundColor: '#EEF1F8', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
});
