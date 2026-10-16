import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Pencil, Trophy, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

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
import { phaseMeta, type Phase } from '@/features/journey/steps';
import { useJourney, type JourneyItem } from '@/features/journey/store';
import { useProfile } from '@/features/profile/store';
import { daysFromToday, formatDayMonth, isSameDay, monthShort, relativeDays } from '@/lib/date';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

function DeadlineRow({ item }: { item: JourneyItem }) {
  const d = daysFromToday(item.date);
  const title = item.kind === 'official' ? item.step.title : item.custom.title;
  const tag = item.kind === 'official' ? item.step.tags.join(' · ') : 'MA TÂCHE';
  return (
    <PressableScale
      onPress={() => item.kind === 'official' && router.push({ pathname: '/(app)/etape/[id]', params: { id: item.step.id } })}
      style={[styles.deadline, item.done && { opacity: 0.55 }]}>
      <View style={styles.dateBox}>
        <Text variant="h3" style={{ fontSize: 15 }}>
          {item.date.getDate()}
        </Text>
        <Text variant="caption" color={palette.muted} style={{ fontSize: 9 }}>
          {monthShort(item.date)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="smallStrong" style={item.done && { textDecorationLine: 'line-through' }}>
          {title}
        </Text>
        <Text variant="caption" color={palette.muted}>
          {tag}
        </Text>
      </View>
      {item.done ? <StatusPill status="done" /> : d < 0 ? <StatusPill status="late" /> : d <= 20 ? <StatusPill status="soon" label={`Dans ${d} j`} /> : <StatusPill status="todo" label={`Dans ${d} j`} />}
    </PressableScale>
  );
}

/** Parcours-quête : « Mes étapes » par phase + « Calendrier » des échéances. */
export default function Parcours() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<'steps' | 'calendar'>(params.view === 'calendar' ? 'calendar' : 'steps');
  const [day, setDay] = useState<Date | null>(null);
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const profile = useProfile((s) => s.profile);
  const j = useJourney();

  const marked = useMemo(() => j.all.map((i) => i.date), [j.all]);
  const list = day ? j.all.filter((i) => isSameDay(i.date, day)) : j.all.filter((i) => daysFromToday(i.date) >= -1 || !i.done);

  return (
    <Screen top={gradients.roleTop.student} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'steps', label: 'Mes étapes' },
            { value: 'calendar', label: 'Calendrier' },
          ]}
        />

        {view === 'steps' ? (
          <Animated.View key="steps" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ gap: 22 }}>
            <MobilityCard compact onEditArrival={() => setArrivalOpen(true)} />
            {(Object.keys(phaseMeta) as Phase[]).map((p, pi) => {
              const items = j.byPhase[p];
              const prog = j.phaseProgress(p);
              const complete = prog.total > 0 && prog.done === prog.total;
              return (
                <Animated.View key={p} entering={FadeInDown.delay(pi * 80).springify()}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View>
                      <Text variant="h2">{phaseMeta[p].title}</Text>
                      <Text variant="small" color={palette.muted}>
                        {phaseMeta[p].subtitle(profile)}
                      </Text>
                    </View>
                    {complete ? (
                      <View style={styles.badge}>
                        <Trophy size={13} color="#B45309" />
                        <Text variant="caption" color="#B45309">
                          Phase validée
                        </Text>
                      </View>
                    ) : (
                      <Text variant="smallStrong" color={palette.muted}>
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
            <Text variant="caption" color={palette.muted} align="center">
              Touche le rond pour valider une étape · touche la ligne pour la fiche
            </Text>
            <AddStepCard />
            <AiCta />
          </Animated.View>
        ) : (
          <Animated.View key="cal" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ gap: 16 }}>
            <Calendar selected={day} onSelect={(d) => setDay(day && isSameDay(d, day) ? null : d)} marked={marked} highlight={j.arrival} initialMonth={j.upcoming[0]?.date ?? new Date()} />
            <PressableScale onPress={() => setArrivalOpen(true)} style={styles.arrival}>
              <IconTile size={42} colors={['#3D78FF', '#014DF8']} radius={13}>
                <CalendarDays size={20} color="#fff" />
              </IconTile>
              <View style={{ flex: 1 }}>
                <Text variant="overline" color={palette.muted} style={{ fontSize: 9 }}>
                  Arrivée prévue
                </Text>
                <Text variant="bodyStrong">
                  {formatDayMonth(j.arrival)} · <Text variant="small" color={palette.subtle}>{relativeDays(j.arrival)}</Text>
                </Text>
              </View>
              <Pencil size={16} color={palette.electric} />
            </PressableScale>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h2">{day ? `Le ${formatDayMonth(day)}` : 'Tes prochaines échéances'}</Text>
              {day ? (
                <PressableScale onPress={() => setDay(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <X size={13} color={palette.muted} />
                  <Text variant="smallStrong" color={palette.muted}>
                    Tout afficher
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
                <CalendarDays size={22} color={palette.muted} />
                <Text variant="h3">Rien de prévu ce jour</Text>
                <Text variant="small" color={palette.muted} align="center">
                  Profite — ou ajoute une tâche ci-dessous, la date est déjà pré-remplie.
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

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  arrival: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  dateBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F2F4FA', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 6, padding: 22, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
});
