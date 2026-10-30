import { CalendarX2, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { formatLong, formatTime, toISODate, weekdayName } from '@/lib/date';
import { upcomingSlots, type WeeklySlot } from '@/lib/paris';
import { enter, reflow } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

type Props = { slots: WeeklySlot[]; busy: string[]; value: Date | null; onChange: (d: Date) => void };

/**
 * Les créneaux libres du mentor sur les 2 prochaines semaines, à l'heure de ton téléphone (le mentor les a choisis
 * à l'heure de Paris). Un jour, puis une heure. Les heures déjà demandées par d'autres n'apparaissent pas.
 */
export function SlotPicker({ slots, busy, value, onChange }: Props) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const [now] = useState(() => new Date());
  const taken = new Set(busy.map((b) => new Date(b).getTime()));
  const free = upcomingSlots(slots, 14, now).filter((d) => !taken.has(d.getTime()));
  const days = [...new Set(free.map((d) => toISODate(d)))];
  const [day, setDay] = useState<string | null>(() => (value ? toISODate(value) : days[0] ?? null));
  const times = free.filter((d) => toISODate(d) === day);

  if (!free.length) {
    return (
      <Animated.View entering={enter(0)} style={[styles.card, styles.empty]}>
        <IconTile icon={CalendarX2} tone="amber" size={48} radius={16} />
        <Text variant="bodyStrong" align="center">
          {t('mentors.book.noSlotTitle')}
        </Text>
        <Text variant="small" color={c.subtle} align="center">
          {t('mentors.book.noSlotText')}
        </Text>
      </Animated.View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text variant="h3">{t('mentors.book.pickDay')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {days.map((iso, i) => {
          const d = new Date(`${iso}T12:00:00`);
          const active = iso === day;
          const count = free.filter((x) => toISODate(x) === iso).length;
          return (
            <Animated.View key={iso} entering={enter(i)}>
              <PressableScale
                haptic="select"
                onPress={() => setDay(iso)}
                style={[styles.day, active && { backgroundColor: c.electric, borderColor: c.electric }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('mentors.book.dayA11y', { day: formatLong(d), count })}>
                <Text variant="caption" color={active ? c.white : c.muted}>
                  {weekdayName(d.getDay(), true)}
                </Text>
                <Text variant="h2" color={active ? c.white : c.navy}>
                  {d.getDate()}
                </Text>
                <Text variant="caption" color={active ? c.white : c.subtle}>
                  {t('mentors.book.slotsCount', { count })}
                </Text>
              </PressableScale>
            </Animated.View>
          );
        })}
      </ScrollView>

      {day ? (
        <Animated.View key={day} entering={enter(1)} layout={reflow} style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={16} color={c.electric} />
            <Text variant="h3" color={c.electric}>
              {t('mentors.book.whatTime', { day: formatLong(new Date(`${day}T12:00:00`)) })}
            </Text>
          </View>
          <View style={styles.times}>
            {times.map((d) => {
              const on = value?.getTime() === d.getTime();
              return (
                <PressableScale
                  key={d.toISOString()}
                  haptic="select"
                  onPress={() => onChange(d)}
                  style={[styles.time, on && { backgroundColor: c.electric, borderColor: c.electric }]}
                  accessibilityState={{ selected: on }}>
                  <Text variant="bodyStrong" color={on ? c.white : c.navy}>
                    {formatTime(d)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Text variant="caption" color={c.muted}>
            {t('mentors.book.localTime')}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  empty: { alignItems: 'center', gap: 8, padding: 22 },
  day: { width: 76, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  time: { width: '23%', height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
}));
