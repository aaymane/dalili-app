import { router } from 'expo-router';
import { MessageCircle, Video } from 'lucide-react-native';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { toast } from '@/components/feedback/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useCancelBooking } from '@/data/hooks';
import type { Booking, Mentor } from '@/data/types';
import { useOpenFromBooking } from '@/features/messages/hooks';
import { useT } from '@/i18n';
import { formatLong, formatTime } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { appointmentState, type AppointmentState } from '../appointments';

/** Une ligne de « Mes rendez-vous » : le mentor, le sujet, la date, l'état, et ce qu'on peut faire maintenant. */
export function AppointmentRow({ booking, mentor, first }: { booking: Booking; mentor?: Mentor; first?: boolean }) {
  const { c, tones } = useTheme();
  const t = useT();
  const styles = useStyles();
  const cancel = useCancelBooking();
  const open = useOpenFromBooking();
  const state = appointmentState(booking);
  const name = mentor ? `${mentor.firstName} ${mentor.lastName}` : t('appointments.mentor');
  const firstName = mentor?.firstName ?? t('appointments.mentor');
  const when = `${formatLong(booking.startsAt)} · ${formatTime(booking.startsAt)}`;
  const active = state === 'pending' || state === 'confirmed' || state === 'live';

  const pill: Record<AppointmentState, { bg: string; fg: string }> = {
    pending: { bg: tones.amber.bg, fg: tones.amber.ink },
    confirmed: { bg: c.successSoft, fg: c.success },
    live: { bg: c.electric, fg: c.white },
    done: { bg: c.fill, fg: c.muted },
    cancelled: { bg: c.fill, fg: c.muted },
    expired: { bg: c.fill, fg: c.muted },
  };

  const askCancel = () => {
    const run = () => cancel.mutate(booking.id, { onError: () => toast(t('mentors.booking.cancelFailed'), 'info') });
    if (Platform.OS === 'web') return run();
    Alert.alert(t('mentors.booking.cancelTitle'), t('mentors.booking.cancelText', { name: firstName }), [
      { text: t('mentors.booking.keep'), style: 'cancel' },
      { text: state === 'pending' ? t('mentors.booking.cancelRequest') : t('mentors.booking.cancelCall'), style: 'destructive', onPress: run },
    ]);
  };

  const write = () =>
    open.mutate(
      { bookingId: booking.id, role: 'student' },
      {
        onSuccess: (id) => (id ? router.push({ pathname: '/(app)/messages/[id]', params: { id } }) : toast(t('mentors.booking.opening'), 'info')),
        onError: () => toast(t('common.offlineRetry'), 'info'),
      },
    );

  return (
    <View style={[styles.row, !first && styles.sep, !active && { opacity: 0.72 }]}>
      <PressableScale
        onPress={() => mentor && router.push({ pathname: '/(app)/mentor/[id]', params: { id: mentor.id } })}
        disabled={!mentor}
        style={styles.main}
        accessibilityRole="button"
        accessibilityLabel={t('appointments.rowA11y', { name, topic: booking.topic, when, state: t(`appointments.state.${state}`) })}>
        <Avatar name={name} color={mentor?.avatarColor ?? c.muted} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="small" color={c.subtle} numberOfLines={1}>
            {booking.topic}
          </Text>
          <Text variant="caption" color={c.muted}>
            {when}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: pill[state].bg }]}>
          <Text variant="caption" color={pill[state].fg}>
            {t(`appointments.state.${state}`)}
          </Text>
        </View>
      </PressableScale>

      {active ? (
        <View style={styles.actions}>
          {state === 'live' ? (
            <PressableScale
              onPress={() => router.push({ pathname: '/(app)/appel/[id]', params: { id: booking.id } })}
              haptic="press"
              style={[styles.action, { backgroundColor: c.electric }]}>
              <Video size={15} color={c.white} />
              <Text variant="smallStrong" color={c.white}>
                {t('appointments.join')}
              </Text>
            </PressableScale>
          ) : null}
          {state !== 'pending' ? (
            <PressableScale onPress={write} disabled={open.isPending} style={[styles.action, styles.soft]} accessibilityLabel={t('mentors.booking.writeTo', { name: firstName })}>
              <MessageCircle size={15} color={c.electric} />
              {state === 'confirmed' ? (
                <Text variant="smallStrong" color={c.electric}>
                  {t('mentors.booking.writeTo', { name: firstName })}
                </Text>
              ) : null}
            </PressableScale>
          ) : null}
          <PressableScale onPress={askCancel} disabled={cancel.isPending} hitSlop={4} style={styles.cancel} accessibilityLabel={state === 'pending' ? t('mentors.booking.cancelRequest') : t('mentors.booking.cancelCall')}>
            <Text variant="smallStrong" color={c.subtle}>
              {t('appointments.cancel')}
            </Text>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ c }) => ({
  row: { padding: 14, gap: 12 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingStart: 56 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: radius.pill },
  soft: { backgroundColor: c.electricSoft },
  cancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, marginStart: 'auto' },
}));
