import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';

import { ChevronRight } from './DirIcons';
import { ListGroup } from './ListGroup';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/**
 * Une ligne de liste (réglages, raccourcis) : une icône sobre dans un rond neutre, le libellé, une précision,
 * et une flèche, un interrupteur ou rien. `danger` : action qui sort ou supprime (rouge).
 */
export function ListRow({ icon: Icon, label, sub, onPress, right, danger }: { icon: LucideIcon; label: string; sub?: string; onPress?: () => void; right?: ReactNode; danger?: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} disabled={!onPress && !right} scaleTo={0.985} style={styles.row} accessibilityRole={onPress ? 'button' : undefined}>
      <ListIcon icon={Icon} danger={danger} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="bodyStrong" color={danger ? c.danger : c.navy}>
          {label}
        </Text>
        {sub ? (
          <Text variant="caption" color={c.muted} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={16} color={c.muted} /> : null)}
    </PressableScale>
  );
}

/** L'icône d'une ligne, seule (pour une ligne au contenu particulier, comme « Apparence »). */
export function ListIcon({ icon: Icon, danger }: { icon: LucideIcon; danger?: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.icon, danger && { backgroundColor: c.dangerSoft }]}>
      <Icon size={18} color={danger ? c.danger : c.navy} />
    </View>
  );
}

/** Une section de lignes : un titre discret (facultatif) au-dessus d'une liste. Elle monte avec `delay`. */
export function ListSection({ title, children, delay = 0 }: { title?: string; children: ReactNode; delay?: number }) {
  const { c } = useTheme();
  return (
    <Animated.View entering={rise(delay)} style={{ gap: 8 }}>
      {title ? (
        <Text variant="smallStrong" color={c.muted} style={{ paddingStart: 4 }}>
          {title}
        </Text>
      ) : null}
      <ListGroup>{children}</ListGroup>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
}));
