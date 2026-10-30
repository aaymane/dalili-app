import { router } from 'expo-router';
import { CalendarCheck2 } from 'lucide-react-native';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useMentors, useMyBookings } from '@/data/hooks';
import type { Booking } from '@/data/types';
import { splitAppointments } from '@/features/mentors/appointments';
import { AppointmentRow } from '@/features/mentors/components/AppointmentRow';
import { ReviewSheet } from '@/features/mentors/components/ReviewSheet';
import { useMyReviewedBookings } from '@/features/mentors/hooks';
import { useT } from '@/i18n';
import { enter, leave, reflow, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Mes rendez-vous : demandes en attente et appels confirmés à venir, puis l'historique. Lu depuis `bookings` (ou le téléphone en démo). */
export default function RendezVous() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const bookings = useMyBookings();
  const { data: mentors = [] } = useMentors();
  const { upcoming, history } = splitAppointments(bookings.data);
  const reviewed = useMyReviewedBookings().data ?? [];
  const [reviewing, setReviewing] = useState<Booking | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const mentorOf = (b: Booking) => mentors.find((m) => m.id === b.mentorId);
  const empty = !bookings.isPending && !bookings.data.length;

  const list = (items: Booking[], from: number) => (
    <Animated.View layout={reflow} style={styles.card}>
      {items.map((b, i) => (
        <Animated.View key={b.id} entering={enter(from + i)} exiting={leave} layout={reflow}>
          <AppointmentRow
            booking={b}
            mentor={mentorOf(b)}
            first={i === 0}
            reviewed={reviewed.includes(b.id)}
            onReview={() => {
              setReviewing(b);
              setReviewOpen(true);
            }}
          />
        </Animated.View>
      ))}
    </Animated.View>
  );

  return (
    <Screen
      padded={false}
      header={<AppHeader back />}
      scrollProps={{
        refreshControl: (
          <RefreshControl refreshing={bookings.isRefetching} onRefresh={() => void bookings.refetch()} tintColor={c.electric} accessibilityLabel={t('appointments.refreshA11y')} />
        ),
      }}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Animated.View entering={enter(0)} style={{ gap: 8 }}>
          <Text variant="hero">{t('appointments.title')}</Text>
          <Text variant="body" color={c.subtle}>
            {t('appointments.intro')}
          </Text>
        </Animated.View>

        {bookings.isError && !bookings.data.length ? (
          <Animated.View entering={rise()} style={[styles.card, styles.state]}>
            <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
              {t('appointments.loadError')}
            </Text>
            <PressableScale onPress={() => void bookings.refetch()} hitSlop={6} style={styles.retry} accessibilityLabel={t('common.retry')}>
              <Text variant="smallStrong" color={c.electric}>
                {t('common.retry')}
              </Text>
            </PressableScale>
          </Animated.View>
        ) : empty ? (
          <Animated.View entering={rise()} style={[styles.card, styles.empty]}>
            <IconTile icon={CalendarCheck2} tone="green" size={56} radius={18} />
            <Text variant="body" color={c.subtle} style={{ textAlign: 'center' }}>
              {t('appointments.empty')}
            </Text>
            <Button label={t('appointments.findMentor')} onPress={() => router.navigate('/(app)/(tabs)/explorer')} />
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={enter(1)}>
              <SectionHeader title={t('appointments.upcoming')} />
              {upcoming.length ? (
                list(upcoming, 2)
              ) : (
                <View style={[styles.card, styles.state]}>
                  <Text variant="small" color={c.subtle} style={{ flex: 1 }}>
                    {t('appointments.emptyUpcoming')}
                  </Text>
                  <PressableScale onPress={() => router.navigate('/(app)/(tabs)/explorer')} hitSlop={6} style={styles.retry}>
                    <Text variant="smallStrong" color={c.electric}>
                      {t('appointments.findMentor')}
                    </Text>
                  </PressableScale>
                </View>
              )}
            </Animated.View>
            {history.length ? (
              <Animated.View entering={enter(2 + upcoming.length)} layout={reflow}>
                <SectionHeader title={t('appointments.history')} />
                {list(history, 3 + upcoming.length)}
              </Animated.View>
            ) : null}
          </>
        )}
      </View>
      <ReviewSheet
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
        bookingId={reviewing?.id ?? null}
        mentorId={reviewing?.mentorId ?? null}
        name={(reviewing && mentorOf(reviewing)?.firstName) ?? t('appointments.mentor')}
      />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { borderRadius: radius.xl, backgroundColor: c.surface, overflow: 'hidden', ...shadow.sm },
  state: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  empty: { alignItems: 'center', gap: 14, padding: 20 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
}));
