import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { isSameDay, monthTitle, startOfDay } from '@/lib/date';
import { palette, radius } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = {
  selected?: Date | null;
  onSelect?: (d: Date) => void;
  /** Jours avec une échéance (point violet sous le chiffre). */
  marked?: Date[];
  /** Jour mis en évidence (ex. arrivée). */
  highlight?: Date | null;
  initialMonth?: Date;
  minDate?: Date;
  accent?: string;
};

const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Calendrier mensuel (semaine commençant le lundi). */
export function Calendar({ selected, onSelect, marked = [], highlight, initialMonth, minDate, accent = palette.electric }: Props) {
  const base = initialMonth ?? selected ?? new Date();
  const [cursor, setCursor] = useState({ y: base.getFullYear(), m: base.getMonth() });

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) out.push(new Date(cursor.y, cursor.m, d));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="h3">{monthTitle(cursor.y, cursor.m)}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <PressableScale onPress={() => move(-1)} style={styles.nav} accessibilityLabel="Mois précédent">
            <ChevronLeft size={16} color={palette.subtle} />
          </PressableScale>
          <PressableScale onPress={() => move(1)} style={styles.nav} accessibilityLabel="Mois suivant">
            <ChevronRight size={16} color={palette.subtle} />
          </PressableScale>
        </View>
      </View>
      <View style={styles.row}>
        {WEEK.map((d, i) => (
          <View key={i} style={styles.cell}>
            <Text variant="caption" color={palette.muted}>
              {d}
            </Text>
          </View>
        ))}
      </View>
      <Animated.View key={`${cursor.y}-${cursor.m}`} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const isSel = selected && isSameDay(d, selected);
          const isHi = highlight && isSameDay(d, highlight);
          const hasMark = marked.some((m) => isSameDay(m, d));
          const disabled = minDate ? startOfDay(d) < startOfDay(minDate) : false;
          const today = isSameDay(d, new Date());
          return (
            <View key={i} style={styles.cell}>
              <PressableScale
                haptic="select"
                disabled={disabled || !onSelect}
                onPress={() => onSelect?.(d)}
                style={[
                  styles.day,
                  isHi && { backgroundColor: '#E7DDFF' },
                  isSel && { backgroundColor: accent },
                  today && !isSel && { borderWidth: 1.5, borderColor: accent },
                ]}>
                <Text variant="smallStrong" color={isSel ? '#fff' : disabled ? '#C5CAD9' : palette.navy}>
                  {d.getDate()}
                </Text>
              </PressableScale>
              {hasMark && <View style={[styles.dot, { backgroundColor: isSel ? accent : '#A78BFA' }]} />}
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: '#E6E9F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  nav: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F2F4FA', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3, minHeight: 42 },
  day: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
});
