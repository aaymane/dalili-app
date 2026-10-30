import { router } from 'expo-router';
import { Moon, Save, Sun, Trash2, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n';
import { weekdayName } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import type { WeeklySlot } from '@/lib/paris';
import { enter, pop, reflow } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { useSaveMySlots } from '../hooks';

/** Lundi d'abord (0 = dimanche, comme la base). */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
/** De 8 h à 21 h 30, toutes les 30 minutes (heure de Paris). */
const TIMES = Array.from({ length: 28 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
const PRESETS: { id: 'evenings' | 'weekend'; icon: LucideIcon; days: number[]; times: string[] }[] = [
  { id: 'evenings', icon: Moon, days: [1, 2, 3, 4, 5], times: ['18:00', '18:30', '19:00', '19:30'] },
  { id: 'weekend', icon: Sun, days: [6, 0], times: ['10:00', '10:30', '11:00', '11:30'] },
];

const key = (s: WeeklySlot) => `${s.weekday}@${s.startTime}`;

/** Mes créneaux : les horaires de la semaine où les étudiants peuvent te demander un appel (heure de Paris). */
export function SlotsEditor({ mentorId, initial }: { mentorId: string; initial: WeeklySlot[] }) {
  const { c, gradients, tones } = useTheme();
  const t = useT();
  const styles = useStyles();
  const save = useSaveMySlots(mentorId);
  const [slots, setSlots] = useState<WeeklySlot[]>(initial);
  const [day, setDay] = useState(WEEK.find((d) => initial.some((s) => s.weekday === d)) ?? 1);
  const on = new Set(slots.map(key));
  const changed = slots.length !== initial.length || initial.some((s) => !on.has(key(s)));
  const ink = tones.green.ink;

  const toggle = (startTime: string) => {
    const s = { weekday: day, startTime };
    setSlots(on.has(key(s)) ? slots.filter((x) => key(x) !== key(s)) : [...slots, s]);
  };
  const applyPreset = (p: (typeof PRESETS)[number]) => {
    haptics.success();
    const add = p.days.flatMap((d) => p.times.map((tm) => ({ weekday: d, startTime: tm }))).filter((s) => !on.has(key(s)));
    setSlots([...slots, ...add]);
  };

  const submit = () =>
    save.mutate(slots, {
      onSuccess: () => {
        haptics.success();
        toast(t('slots.saved', { count: slots.length }));
        router.back();
      },
      onError: () => toast(t('common.notSaved'), 'info'),
    });

  return (
    <Screen
      top={gradients.roleTop.mentor}
      padded={false}
      header={<AppHeader back hideActions />}
      footer={<Button label={t('slots.save', { count: slots.length })} accent={gradients.mentor} icon={<Save size={17} color="#fff" />} loading={save.isPending} disabled={!changed} onPress={submit} />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Animated.View entering={enter(0)} style={{ gap: 6 }}>
          <Text variant="hero">{t('slots.title')}</Text>
          <Text variant="body" color={c.subtle}>
            {t('slots.intro')}
          </Text>
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.presets}>
          {PRESETS.map((p) => (
            <PressableScale key={p.id} onPress={() => applyPreset(p)} style={styles.preset} accessibilityRole="button">
              <p.icon size={16} color={ink} />
              <Text variant="smallStrong" color={ink}>
                {t(`slots.presets.${p.id}`)}
              </Text>
            </PressableScale>
          ))}
        </Animated.View>

        <Animated.View entering={enter(2)} style={styles.week}>
          {WEEK.map((d) => {
            const count = slots.filter((s) => s.weekday === d).length;
            const active = d === day;
            return (
              <PressableScale
                key={d}
                haptic="select"
                onPress={() => setDay(d)}
                style={[styles.day, active && { backgroundColor: ink, borderColor: ink }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('slots.dayA11y', { day: weekdayName(d), count })}>
                <Text variant="smallStrong" color={active ? c.bg : c.navy}>
                  {weekdayName(d, true)}
                </Text>
                {count ? (
                  <Animated.View key={count} entering={pop()} style={[styles.badge, { backgroundColor: active ? c.bg : ink }]}>
                    <Text variant="caption" color={active ? ink : c.bg} style={{ fontSize: 10 }}>
                      {count}
                    </Text>
                  </Animated.View>
                ) : (
                  <View style={styles.badgeEmpty} />
                )}
              </PressableScale>
            );
          })}
        </Animated.View>

        <Animated.View key={day} entering={enter(3)} layout={reflow} style={styles.card}>
          <View style={styles.cardHead}>
            <Text variant="h3">{weekdayName(day)}</Text>
            {slots.some((s) => s.weekday === day) ? (
              <PressableScale onPress={() => setSlots(slots.filter((s) => s.weekday !== day))} hitSlop={8} style={styles.clear} accessibilityLabel={t('slots.clearDay')}>
                <Trash2 size={14} color={c.subtle} />
                <Text variant="smallStrong" color={c.subtle}>
                  {t('slots.clearDay')}
                </Text>
              </PressableScale>
            ) : null}
          </View>
          <View style={styles.times}>
            {TIMES.map((tm) => {
              const selected = on.has(`${day}@${tm}`);
              return (
                <PressableScale
                  key={tm}
                  haptic="select"
                  onPress={() => toggle(tm)}
                  style={[styles.time, selected && { backgroundColor: ink, borderColor: ink }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}>
                  <Text variant="bodyStrong" color={selected ? c.bg : c.navy}>
                    {tm}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Text variant="caption" color={c.muted}>
            {t('slots.parisNote')}
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  presets: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.pill, backgroundColor: c.mentorSoft },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  day: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface, minHeight: 60 },
  badge: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeEmpty: { height: 18 },
  card: { gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  time: { width: '23%', height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
}));
