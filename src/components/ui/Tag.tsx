import { Check } from 'lucide-react-native';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { Text } from './Text';

/** Petit tag majuscule (ex. « VISA · VLS-TS »). */
export function Tag({ label, color, bg, style }: { label: string; color?: string; bg?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const styles = useStyles();
  color ??= c.electric;
  bg ??= c.electricSoft;
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
  const { c } = useTheme();
  const styles = useStyles();
  const map = {
    done: { bg: c.successSoft, fg: c.success, text: 'Fait' },
    todo: { bg: c.fill, fg: c.muted, text: 'À venir' },
    current: { bg: c.electric, fg: c.white, text: 'À toi de jouer' },
    late: { bg: c.dangerSoft, fg: c.danger, text: 'En retard' },
    soon: { bg: c.dangerSoft, fg: c.danger, text: 'Bientôt' },
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
export function Chip({ label, count, active, color }: { label: string; count?: number; active?: boolean; color?: string }) {
  const { c } = useTheme();
  const styles = useStyles();
  color ??= c.electric;
  return (
    <View style={[styles.chip, active ? { backgroundColor: color, borderColor: color } : null]}>
      <Text variant="smallStrong" color={active ? c.white : c.navy}>
        {label}
      </Text>
      {count != null && (
        <View style={[styles.count, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text variant="caption" color={active ? c.white : c.subtle} style={{ fontSize: 10 }}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  tag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
  },
  count: { backgroundColor: c.fill, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
}));
