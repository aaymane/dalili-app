import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Pencil, Trophy, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Calendar } from '@/components/ui/Calendar';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { StatusPill } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { AiCta } from '@/features/home/AiCta';
import { AddStepCard } from '@/features/journey/components/AddStepCard';
import { ArrivalSheet } from '@/features/journey/components/ArrivalSheet';
import { MobilityCard } from '@/features/journey/components/MobilityCard';
import { StepRow } from '@/features/journey/components/StepRow';
import { PHASES, phaseMeta } from '@/features/journey/steps';
import { useJourney, type JourneyItem } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { daysFromToday, formatDayMonth, isSameDay, monthShort, relativeDays } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

function DeadlineRow({ item }: { item: JourneyItem }) {
  const { c } = useTheme();
  const styles = useStyles();
  const d = daysFromToday(item.date);
  const title = item.kind === 'official' ? item.step.title : item.custom.title;
  const t = useT();
  const tag = item.kind === 'official' ? item.step.tags.join(' · ') : t('journey.myTask');
  return (
    <PressableScale
      onPress={() => item.kind === 'official' && router.push({ pathname: '/(app)/etape/[id]', params: { id: item.step.id } })}
      style={[styles.deadline, item.done && { opacity: 0.55 }]}>
      <View style={styles.dateBox}>
        <Text variant="h3" style={{ fontSize: 15 }}>
          {item.date.getDate()}
        </Text>
        <Text variant="caption" color={c.muted} style={{ fontSize: 9 }}>
          {monthShort(item.date)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="smallStrong" style={item.done && { textDecorationLine: 'line-through' }}>
          {title}
        </Text>
        <Text variant="caption" color={c.muted}>
          {tag}
        </Text>
      </View>
      {item.done ? <StatusPill status="done" /> : d < 0 ? <StatusPill status="late" /> : d <= 20 ? <StatusPill status="soon" label={t('dates.inDaysShort', { count: d })} /> : <StatusPill status="todo" label={t('dates.inDaysShort', { count: d })} />}
    </PressableScale>
  );
}

/** Parcours-quête : « Mes étapes » par phase + « Calendrier » des échéances. */
export default function Parcours() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<'steps' | 'calendar'>(params.view === 'calendar' ? 'calendar' : 'steps');
  const [day, setDay] = useState<Date | null>(null);
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const t = useT();

  const marked = useMemo(() => j.all.map((i) => i.date), [j.all]);
  const list = day ? j.all.filter((i) => isSameDay(i.date, day)) : j.all.filter((i) => daysFromToday(i.date) >= -1 || !i.done);

  return (
    <Screen top={gradients.roleTop.student} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'steps', label: t('journey.tabSteps') },
            { value: 'calendar', label: t('journey.tabCalendar') },
          ]}
        />

        {view === 'steps' ? (
          <Animated.View key="steps" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ gap: 22 }}>
            <MobilityCard compact onEditArrival={() => setArrivalOpen(true)} />
            {PHASES.map((p, pi) => {
              const meta = phaseMeta(p, profile);
              const items = j.byPhase[p];
              const prog = j.phaseProgress(p);
              const complete = prog.total > 0 && prog.done === prog.total;
              return (
                <Animated.View key={p} entering={rise(pi * 80)}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View>
                      <Text variant="h2">{meta.title}</Text>
                      <Text variant="small" color={c.muted}>
                        {meta.subtitle}
                      </Text>
                    </View>
                    {complete ? (
                      <View style={styles.badge}>
                        <Trophy size={13} color="#B45309" />
                        <Text variant="caption" color="#B45309">
                          {t('journey.phaseDone')}
                        </Text>
                      </View>
                    ) : (
                      <Text variant="smallStrong" color={c.muted}>
                        {prog.done}/{prog.total}
                      </Text>
                    )}
                  </View>
                  {items.map((it) => (
                    <StepRow key={it.kind === 'official' ? it.step.id : it.custom.id} item={it} />
                  ))}
                </Animated.View>
              );
            })}
            <Text variant="caption" color={c.muted} align="center">
              {t('journey.hint')}
            </Text>
            <AddStepCard />
            <AiCta />
          </Animated.View>
        ) : (
          <Animated.View key="cal" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ gap: 16 }}>
            <Calendar selected={day} onSelect={(d) => setDay(day && isSameDay(d, day) ? null : d)} marked={marked} highlight={j.arrival} initialMonth={j.upcoming[0]?.date ?? new Date()} />
            <PressableScale onPress={() => setArrivalOpen(true)} style={styles.arrival}>
              <IconTile icon={CalendarDays} tone="blue" size={42} radius={13} />
              <View style={{ flex: 1 }}>
                <Text variant="overline" color={c.muted} style={{ fontSize: 9 }}>
                  {t('journey.plannedArrival')}
                </Text>
                <Text variant="bodyStrong">
                  {formatDayMonth(j.arrival)} · <Text variant="small" color={c.subtle}>{relativeDays(j.arrival)}</Text>
                </Text>
              </View>
              <Pencil size={16} color={c.electric} />
            </PressableScale>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h2">{day ? t('journey.onDay', { date: formatDayMonth(day) }) : t('journey.nextDeadlines')}</Text>
              {day ? (
                <PressableScale onPress={() => setDay(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <X size={13} color={c.muted} />
                  <Text variant="smallStrong" color={c.muted}>
                    {t('journey.showAll')}
                  </Text>
                </PressableScale>
              ) : null}
            </View>
            {list.length ? (
              <View style={{ gap: 10 }}>
                {list.map((it) => (
                  <DeadlineRow key={it.kind === 'official' ? it.step.id : it.custom.id} item={it} />
                ))}
              </View>
            ) : (
              <View style={styles.empty}>
                <CalendarDays size={22} color={c.muted} />
                <Text variant="h3">{t('journey.nothingThatDay')}</Text>
                <Text variant="small" color={c.muted} align="center">
                  {t('journey.nothingThatDayText')}
                </Text>
              </View>
            )}
            <AddStepCard key={day?.toISOString()} defaultDate={day ?? undefined} />
          </Animated.View>
        )}
      </View>
      <ArrivalSheet visible={arrivalOpen} onClose={() => setArrivalOpen(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.warningSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  arrival: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  dateBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 6, padding: 22, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
}));
