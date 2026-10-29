import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { isSameDay, monthTitle, startOfDay } from '@/lib/date';
import { pop, slideIn, slideOut } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

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

/** Calendrier mensuel (semaine commençant le lundi). Flèches ou balayage horizontal pour changer de mois. */
export function Calendar({ selected, onSelect, marked = [], highlight, initialMonth, minDate, accent }: Props) {
  const styles = useStyles();
  const { c } = useTheme();
  accent ??= c.electric;
  const base = initialMonth ?? selected ?? new Date();
  // `dir` : sens du dernier changement de mois, pour que la grille glisse du bon côté.
  const [cursor, setCursor] = useState({ y: base.getFullYear(), m: base.getMonth(), dir: 1 });

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) out.push(new Date(cursor.y, cursor.m, d));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const dir = useSharedValue(1);
  const move = (delta: number) => {
    dir.set(delta);
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth(), dir: delta };
    });
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-14, 14])
    .onEnd((e) => {
      if (e.translationX < -40 || e.velocityX < -500) scheduleOnRN(move, 1);
      else if (e.translationX > 40 || e.velocityX > 500) scheduleOnRN(move, -1);
    });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Animated.View key={`${cursor.y}-${cursor.m}`} entering={slideIn(cursor.dir)} exiting={slideOut(dir)}>
          <Text variant="h3">{monthTitle(cursor.y, cursor.m)}</Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <PressableScale onPress={() => move(-1)} style={styles.nav} accessibilityLabel="Mois précédent">
            <ChevronLeft size={16} color={c.subtle} />
          </PressableScale>
          <PressableScale onPress={() => move(1)} style={styles.nav} accessibilityLabel="Mois suivant">
            <ChevronRight size={16} color={c.subtle} />
          </PressableScale>
        </View>
      </View>
      <View style={styles.row}>
        {WEEK.map((d, i) => (
          <View key={i} style={styles.cell}>
            <Text variant="caption" color={c.muted}>
              {d}
            </Text>
          </View>
        ))}
      </View>
      <GestureDetector gesture={swipe}>
        <Animated.View key={`${cursor.y}-${cursor.m}`} entering={slideIn(cursor.dir)} exiting={slideOut(dir)} style={styles.grid}>
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
                  style={[styles.day, isHi && { backgroundColor: '#E7DDFF' }, today && !isSel && { borderWidth: 1.5, borderColor: accent }]}>
                  {/* Le jour choisi se pose (au lieu de changer de couleur d'un coup). */}
                  {isSel && <Animated.View entering={pop()} style={[StyleSheet.absoluteFill, { borderRadius: 11, backgroundColor: accent }]} />}
                  <Text variant="smallStrong" color={isSel ? '#fff' : disabled ? c.lineStrong : c.navy}>
                    {d.getDate()}
                  </Text>
                </PressableScale>
                {hasMark && <View style={[styles.dot, { backgroundColor: isSel ? accent : '#A78BFA' }]} />}
              </View>
            );
          })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  card: { backgroundColor: c.card, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: c.line, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  nav: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3, minHeight: 42 },
  day: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
}));
