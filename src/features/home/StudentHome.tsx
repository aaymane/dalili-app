import { router } from 'expo-router';
import { MessageCircle, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Reveal } from '@/components/motion/Reveal';
import { Screen } from '@/components/layout/Screen';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useGroups, useMentors, useMyBookings } from '@/data/hooks';
import { ArrivalSheet } from '@/features/journey/components/ArrivalSheet';
import { Ticket } from '@/features/journey/components/Ticket';
import { useTicket } from '@/features/journey/ticket';
import { splitAppointments } from '@/features/mentors/appointments';
import { BookingCard } from '@/features/mentors/components/BookingCard';
import { MentorTile } from '@/features/mentors/components/MentorCard';
import { MentorsSoon } from '@/features/mentors/components/MentorsSoon';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { enter } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

import { AskField } from './AskField';
import { Greeting, NextStepCard } from './NextStep';
import { ToolsGrid } from './ToolsGrid';

/**
 * Accueil Étudiant, léger : le salut (ou le billet quand l'arrivée approche), la prochaine étape en une carte fine,
 * le champ pour demander à Dalili, puis ton appel, les mentors, les outils et les communautés.
 * Le chemin illustré et la carte mobilité vivent dans Parcours.
 */
export function StudentHome() {
  const { c, gradients } = useTheme();
  const styles = useStyles();
  const profile = useProfile((s) => s.profile);
  const { data: mentors = [] } = useMentors();
  const { data: groups } = useGroups();
  const { data: allBookings } = useMyBookings();
  // Prochaine demande en attente ou prochain appel (le plus proche d'abord) ; un appel terminé disparaît d'ici.
  const bookings = splitAppointments(allBookings).upcoming;
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const ticket = useTicket();
  const t = useT();

  const city = profile.destinationCity;
  const suggested = [...mentors].sort((a, b) => Number(b.city === city) - Number(a.city === city) || b.rating - a.rating).slice(0, 6);
  const cityGroups = groups.filter((g) => !city || g.city === city).slice(0, 3);
  const booking = bookings[0];
  const bookingMentor = booking ? mentors.find((m) => m.id === booking.mentorId) : null;

  return (
    <Screen top={gradients.roleTop.student} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        {ticket.onHome ? (
          <Animated.View entering={enter(0)}>
            <Ticket data={ticket.data} onPress={() => setArrivalOpen(true)} />
          </Animated.View>
        ) : (
          <Greeting />
        )}
        <NextStepCard />
        <Animated.View entering={enter(3)}>
          <AskField />
        </Animated.View>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 28, marginTop: 28 }}>
        {booking && bookingMentor ? <BookingCard booking={booking} mentor={bookingMentor} /> : null}

        <Reveal>
          <SectionHeader
            title={t('home.mentors')}
            subtitle={city ? t('home.mentorsCity', { city }) : t('home.mentorsAny')}
            action={suggested.length ? t('common.all') : undefined}
            onAction={() => router.navigate('/(app)/(tabs)/explorer')}
          />
          {suggested.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {suggested.map((m) => (
                <MentorTile key={m.id} m={m} />
              ))}
            </ScrollView>
          ) : (
            <MentorsSoon />
          )}
        </Reveal>

        <Reveal>
          <SectionHeader title={t('home.tools')} subtitle={t('home.toolsSub')} />
          <ToolsGrid />
        </Reveal>

        <Reveal>
          <SectionHeader title={city ? t('home.communitiesCity', { city }) : t('home.communities')} subtitle={t('home.communitiesSub')} action={t('common.see')} onAction={() => router.navigate('/(app)/(tabs)/communaute')} />
          <View style={{ gap: 10 }}>
            {cityGroups.map((g) => (
              <PressableScale key={g.id} onPress={() => router.push({ pathname: '/(app)/groupe/[id]', params: { id: g.id } })} style={styles.groupRow}>
                <IconTile icon={MessageCircle} tone="blue" size={46} radius={23} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{g.name}</Text>
                  <Text variant="caption" color={c.muted} numberOfLines={1}>
                    {g.tags.join(' · ')}
                  </Text>
                </View>
                <View style={styles.count}>
                  <Users size={12} color={c.subtle} />
                  <Text variant="caption" color={c.subtle} accessibilityLabel={t('community.members', { count: g.members })}>
                    {g.members}
                  </Text>
                </View>
              </PressableScale>
            ))}
          </View>
        </Reveal>
      </View>
      <ArrivalSheet visible={arrivalOpen} onClose={() => setArrivalOpen(false)} />
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: c.fill },
}));
