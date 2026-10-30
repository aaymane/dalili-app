import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarCheck2, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SuccessModal } from '@/components/feedback/SuccessModal';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { remoteCreateBooking } from '@/data/api';
import { useCancelBooking, useMentor, useMentors, useMyBookings } from '@/data/hooks';
import { askNotifications, notifyServer } from '@/features/notifications/push';
import { useLocalDb } from '@/data/local-db';
import { useT } from '@/i18n';
import { formatLong, formatTime } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';
import { track } from '@/lib/analytics';
import { activeBooking } from '@/features/mentors/appointments';
import { SlotPicker } from '@/features/mentors/components/SlotPicker';
import { useBusyTimes, useMentorSlots } from '@/features/mentors/hooks';
import { specialtyLabel } from '@/features/mentors/specialties';

/** Heures que l'étudiant peut proposer. Ce ne sont pas des disponibilités : le mentor accepte selon son moment. */
const TIMES = ['09:00', '10:30', '12:00', '14:00', '16:00', '18:00', '19:30', '21:00'];

const at = (day: Date, time: string) => {
  const [h, min] = time.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, min, 0, 0);
  return d;
};

/**
 * Demande d'appel à un mentor : un sujet, puis un de ses créneaux libres (ou, s'il n'en a pas, un jour et une heure
 * proposés). Le mentor accepte ou décline toujours.
 */
export default function Reserve() {
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: m } = useMentor(id);
  const qc = useQueryClient();
  const addBooking = useLocalDb((s) => s.addBooking);
  const [topic, setTopic] = useState('');
  const [day, setDay] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slotAt, setSlotAt] = useState<Date | null>(null);
  const slots = useMentorSlots(id);
  const busy = useBusyTimes(id);
  const bySlots = (slots.data?.length ?? 0) > 0;
  const chosen = bySlots ? slotAt : day && time ? at(day, time) : null;
  // Une demande à la fois : tant que la précédente n'est pas passée (ou annulée), on la montre au lieu du formulaire.
  const active = activeBooking(useMyBookings().data);
  const activeMentor = useMentors().data?.find((x) => x.id === active?.mentorId);
  const cancel = useCancelBooking();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Aujourd'hui, on ne propose pas une heure déjà passée (ni dans moins d'une heure).
  const [opened] = useState(() => Date.now());
  const past = (slot: string) => !!day && at(day, slot).getTime() < opened + 3_600_000;

  const send = async () => {
    if (!m || !chosen) return;
    const startsAt = chosen.toISOString();
    const topicText = topic.trim() || t('mentors.book.defaultTopic');
    setLoading(true);
    try {
      const saved = await remoteCreateBooking({ mentorId: m.id, startsAt, topic: topicText });
      if (saved) {
        void qc.invalidateQueries({ queryKey: ['bookings', 'mine'] });
        // Le mentor est prévenu ; et toi, tu le seras de sa réponse si tu dis oui aux notifications.
        void notifyServer('booking_created', saved.id);
        void askNotifications();
      }
      else addBooking({ id: `b-${Date.now()}`, mentorId: m.id, startsAt, topic: topicText, status: 'pending' });
      track('mentor_request_sent');
      setDone(true);
    } catch (e) {
      // 42501 = la base refuse (mentor passé en pause entre-temps, ou ta propre fiche) ;
      // 23505 / 23514 = ce créneau vient d'être pris, ou n'existe plus ; DLL01 = une demande déjà en cours ; sinon, le réseau.
      const code = (e as { code?: string }).code;
      if (code === 'DLL01') {
        void qc.invalidateQueries({ queryKey: ['bookings', 'mine'] });
        toast(t('mentors.book.oneAtATime'), 'info');
      } else if (code === '23505' || code === '23514') {
        setSlotAt(null);
        void busy.refetch();
        void slots.refetch();
        toast(t('mentors.book.slotTaken'), 'info');
      } else toast(code === '42501' ? t('mentors.book.refused', { name: m.firstName }) : t('mentors.book.notSent'), 'info');
    } finally {
      setLoading(false);
    }
  };

  if (!m) return null;
  const paused = !m.availableThisWeek;
  const blocked = !!active && !done;
  return (
    <Screen
      top={gradients.roleTop.student}
      padded={false}
      header={<AppHeader back />}
      footer={paused || blocked ? undefined : <Button label={t('mentors.book.send')} disabled={!chosen} loading={loading} onPress={send} />}>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <Animated.View entering={rise()} style={styles.who}>
          <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="smallStrong" color={c.electric}>
              {t('mentors.book.freeCall')}
            </Text>
            <Text variant="h2">{t('mentors.book.with', { name: m.firstName })}</Text>
            <Text variant="small" color={c.muted}>
              {m.headline ? `${m.headline} · ` : ''}
              {m.city}
            </Text>
          </View>
        </Animated.View>

        {blocked && active ? (
          <Animated.View entering={rise(60)} style={[styles.note, styles.active]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CalendarCheck2 size={20} color={c.electric} />
              <Text variant="h3" style={{ flex: 1 }}>
                {t('mentors.book.activeTitle')}
              </Text>
            </View>
            <Text variant="body" color={c.subtle}>
              {t(active.status === 'pending' ? 'mentors.book.activePending' : 'mentors.book.activeConfirmed', {
                name: activeMentor?.firstName ?? t('appointments.mentor'),
                when: `${formatLong(active.startsAt)} · ${formatTime(active.startsAt)}`,
              })}
            </Text>
            <Text variant="small" color={c.muted}>
              {t('mentors.book.activeRule')}
            </Text>
            <Button label={t('mentors.book.activeSee')} size="md" onPress={() => router.push('/(app)/rendez-vous')} />
            {active.status === 'pending' ? (
              <Button
                label={t('mentors.booking.cancelRequest')}
                variant="ghost"
                size="md"
                loading={cancel.isPending}
                onPress={() => cancel.mutate(active.id, { onError: () => toast(t('mentors.booking.cancelFailed'), 'info') })}
              />
            ) : null}
          </Animated.View>
        ) : paused ? (
          <Animated.View entering={rise(60)} style={styles.note}>
            <Text variant="bodyStrong">{t('mentors.book.pausedTitle', { name: m.firstName })}</Text>
            <Text variant="small" color={c.subtle}>
              {t('mentors.book.pausedText')}
            </Text>
            <Button label={t('mentors.book.otherMentors')} variant="secondary" size="md" onPress={() => router.navigate('/(app)/(tabs)/explorer')} />
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={rise(60)} style={styles.note}>
              <Text variant="small" color={c.subtle}>
                {bySlots ? t('mentors.book.hintSlots', { name: m.firstName }) : t('mentors.book.hint', { name: m.firstName })}
              </Text>
            </Animated.View>

            <View style={{ gap: 8 }}>
              <Text variant="h3">{t('mentors.book.topic')}</Text>
              <Input placeholder={t('mentors.book.topicPlaceholder')} value={topic} onChangeText={setTopic} maxLength={80} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {m.specialties.map((sp) => (
                  <PressableScale key={sp} haptic="select" onPress={() => setTopic(specialtyLabel(sp))} style={[styles.suggest, topic === specialtyLabel(sp) && { backgroundColor: c.electric }]}>
                    <Text variant="smallStrong" color={topic === specialtyLabel(sp) ? c.white : c.electric}>
                      {specialtyLabel(sp)}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            </View>

            {slots.isPending ? null : bySlots ? (
              <SlotPicker slots={slots.data ?? []} busy={busy.data ?? []} value={slotAt} onChange={setSlotAt} />
            ) : (
              <>
                <Calendar
                  selected={day}
                  onSelect={(d) => {
                    setDay(d);
                    setTime(null);
                  }}
                  minDate={new Date()}
                />

                {day ? (
                  <Animated.View entering={FadeIn.duration(250)} style={styles.timesCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Clock size={16} color={c.electric} />
                      <Text variant="h3" color={c.electric}>
                        {t('mentors.book.whatTime', { day: formatLong(day) })}
                      </Text>
                    </View>
                    <View style={styles.times}>
                      {TIMES.map((slot) => {
                        const off = past(slot);
                        const on = time === slot;
                        return (
                          <PressableScale
                            key={slot}
                            disabled={off}
                            haptic="select"
                            onPress={() => setTime(slot)}
                            style={[styles.time, on && { backgroundColor: c.electric, borderColor: c.electric }, off && { opacity: 0.35 }]}
                            accessibilityState={{ selected: on, disabled: off }}>
                            <Text variant="bodyStrong" color={on ? c.white : c.navy}>
                              {formatTime(at(day, slot))}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </Animated.View>
                ) : null}
              </>
            )}
          </>
        )}
      </View>

      <SuccessModal
        visible={done}
        title={t('mentors.book.successTitle')}
        message={t('mentors.book.successText', { name: m.firstName })}
        cta={t('mentors.book.successCta')}
        onCta={() => {
          setDone(false);
          router.dismissTo('/(app)/(tabs)');
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  note: { gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: c.surface },
  active: { padding: 18, borderWidth: 1.5, borderColor: c.electricSoft },
  suggest: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: c.electricSoft },
  timesCard: { gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: c.surface, ...shadow.sm },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  time: { width: '23%', height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
}));
