import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Sparkles, Trophy, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Calendar } from '@/components/ui/Calendar';
import { ChevronRight } from '@/components/ui/DirIcons';
import { ListGroup } from '@/components/ui/ListGroup';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { AddStepCard } from '@/features/journey/components/AddStepCard';
import { ArrivalSheet } from '@/features/journey/components/ArrivalSheet';
import { JourneyPath } from '@/features/journey/components/JourneyPath';
import { JourneySummary } from '@/features/journey/components/JourneySummary';
import { StepRow, StepStatus } from '@/features/journey/components/StepRow';
import { PHASES, phaseMeta } from '@/features/journey/steps';
import { useJourney, type JourneyItem } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { daysFromToday, formatDayMonth, isSameDay, monthShort } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

type Tab = 'steps' | 'path' | 'calendar';

const keyOf = (it: JourneyItem) => (it.kind === 'official' ? it.step.id : it.custom.id);

function DeadlineRow({ item }: { item: JourneyItem }) {
  const { c } = useTheme();
  const styles = useStyles();
  const t = useT();
  const title = item.kind === 'official' ? item.step.title : item.custom.title;
  const sub = item.kind === 'official' ? item.step.window : t('journey.myTask');
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => item.kind === 'official' && router.push({ pathname: '/(app)/etape/[id]', params: { id: item.step.id } })}
      style={styles.deadline}>
      <View style={styles.dateBox}>
        <Text variant="h3" style={{ fontSize: 15 }} color={item.done ? c.muted : c.navy}>
          {item.date.getDate()}
        </Text>
        <Text variant="caption" color={c.muted} style={{ fontSize: 9 }}>
          {monthShort(item.date)}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="smallStrong" color={item.done ? c.muted : c.navy} numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" color={c.muted} numberOfLines={1}>
          {item.done ? t('status.done') : sub}
        </Text>
      </View>
      <StepStatus item={item} />
    </PressableScale>
  );
}

/** Parcours-quête : « Mes étapes » par phase, le « Chemin » illustré et le « Calendrier » des échéances. */
export default function Parcours() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ view?: string }>();
  // La vue vit dans l'URL : un lien « Calendrier » ou « Chemin » de l'accueil l'ouvre même si l'écran est déjà là.
  const view: Tab = params.view === 'calendar' || params.view === 'path' ? params.view : 'steps';
  const setView = (v: Tab) => router.setParams({ view: v });
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
          kind="track"
          value={view}
          onChange={setView}
          options={[
            { value: 'steps', label: t('journey.tabSteps') },
            { value: 'path', label: t('journey.tabPath') },
            { value: 'calendar', label: t('journey.tabCalendar') },
          ]}
        />

        {view === 'steps' ? (
          <Animated.View key="steps" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ gap: 26 }}>
            <JourneySummary onEditArrival={() => setArrivalOpen(true)} />
            {PHASES.map((p, pi) => {
              const meta = phaseMeta(p, profile);
              const items = j.byPhase[p];
              const prog = j.phaseProgress(p);
              const complete = prog.total > 0 && prog.done === prog.total;
              if (!items.length) return null;
              return (
                <Animated.View key={p} entering={rise(pi * 80)} style={{ gap: 10 }}>
                  <View style={styles.phaseHead}>
                    <View style={{ flex: 1 }}>
                      <Text variant="h2">{meta.title}</Text>
                      <Text variant="small" color={c.muted}>
                        {meta.subtitle}
                      </Text>
                    </View>
                    {complete ? (
                      <View style={styles.badge}>
                        <Trophy size={13} color={c.warningInk} />
                        <Text variant="caption" color={c.warningInk}>
                          {t('journey.phaseDone')}
                        </Text>
                      </View>
                    ) : (
                      <Text variant="smallStrong" color={c.muted}>
                        {prog.done}/{prog.total}
                      </Text>
                    )}
                  </View>
                  <ListGroup>
                    {items.map((it) => (
                      <StepRow key={keyOf(it)} item={it} />
                    ))}
                  </ListGroup>
                </Animated.View>
              );
            })}
            <View style={{ gap: 6 }}>
              <AddStepCard />
              <Text variant="caption" color={c.muted}>
                {t('journey.hint')}
              </Text>
            </View>
            <PressableScale onPress={() => router.navigate('/(app)/(tabs)/ia')} style={styles.ask} haptic="press">
              <Sparkles size={18} color={c.electric} />
              <View style={{ flex: 1 }}>
                <Text variant="smallStrong">{t('journey.askTitle')}</Text>
                <Text variant="caption" color={c.muted}>
                  {t('home.askAiSub')}
                </Text>
              </View>
              <ChevronRight size={16} color={c.muted} />
            </PressableScale>
          </Animated.View>
        ) : view === 'path' ? (
          // Le chemin illustré, de ta ville à ta nouvelle vie, jusqu'au billet (il se trace au défilement).
          <Animated.View key="path" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
            <JourneyPath />
          </Animated.View>
        ) : (
          <Animated.View key="cal" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ gap: 18 }}>
            <Calendar selected={day} onSelect={(d) => setDay(day && isSameDay(d, day) ? null : d)} marked={marked} highlight={j.arrival} initialMonth={j.upcoming[0]?.date ?? new Date()} />
            <JourneySummary onEditArrival={() => setArrivalOpen(true)} />
            <View style={{ gap: 10 }}>
              <View style={styles.phaseHead}>
                <Text variant="h2" style={{ flex: 1 }}>
                  {day ? t('journey.onDay', { date: formatDayMonth(day) }) : t('journey.nextDeadlines')}
                </Text>
                {day ? (
                  <PressableScale onPress={() => setDay(null)} style={styles.showAll} hitSlop={8}>
                    <X size={13} color={c.muted} />
                    <Text variant="smallStrong" color={c.muted}>
                      {t('journey.showAll')}
                    </Text>
                  </PressableScale>
                ) : null}
              </View>
              {list.length ? (
                <ListGroup>
                  {list.map((it) => (
                    <DeadlineRow key={keyOf(it)} item={it} />
                  ))}
                </ListGroup>
              ) : (
                <View style={styles.empty}>
                  <CalendarDays size={22} color={c.muted} />
                  <Text variant="h3">{t('journey.nothingThatDay')}</Text>
                  <Text variant="small" color={c.muted} align="center">
                    {t('journey.nothingThatDayText')}
                  </Text>
                </View>
              )}
            </View>
            <AddStepCard key={day?.toISOString()} defaultDate={day ?? undefined} />
          </Animated.View>
        )}
      </View>
      <ArrivalSheet visible={arrivalOpen} onClose={() => setArrivalOpen(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  phaseHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.warningSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  dateBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
  showAll: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: c.card, ...shadow.sm },
  empty: { alignItems: 'center', gap: 6, padding: 22, borderRadius: radius.lg, backgroundColor: c.card, ...shadow.sm },
}));
