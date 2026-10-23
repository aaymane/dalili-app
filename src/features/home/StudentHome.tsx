import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, Map, MessageCircle, Video } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Reveal } from '@/components/motion/Reveal';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useGroups, useMentors } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { ArrivalSheet } from '@/features/journey/components/ArrivalSheet';
import { JourneyPath } from '@/features/journey/components/JourneyPath';
import { MobilityCard } from '@/features/journey/components/MobilityCard';
import { Ticket } from '@/features/journey/components/Ticket';
import { useJourney } from '@/features/journey/store';
import { useTicket } from '@/features/journey/ticket';
import { MentorTile } from '@/features/mentors/components/MentorCard';
import { MentorsSoon } from '@/features/mentors/components/MentorsSoon';
import { useProfile } from '@/features/profile/store';
import { daysFromToday, formatLong, formatTime } from '@/lib/date';
import { enter, reflow } from '@/theme/motion';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

import { ActionCard } from './ActionCard';
import { AskField } from './AskField';
import { BriefHero, BriefLine } from './BriefHero';
import { ToolsGrid } from './ToolsGrid';

/**
 * Accueil Étudiant · « Brief du jour » (docs/VISION.md §4.A), dans l'ordre de lecture :
 * l'Âme et la phrase du jour, ta seule action, le champ pour demander à Dalili, puis le reste.
 */
export function StudentHome() {
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const { data: mentors = [] } = useMentors();
  const { data: groups } = useGroups();
  const [since] = useState(() => Date.now() - 3_600_000);
  const bookings = useLocalDb((s) => s.bookings).filter((b) => b.status === 'confirmed' && new Date(b.startsAt).getTime() > since);
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const ticket = useTicket();

  const city = profile.destinationCity;
  const suggested = [...mentors].sort((a, b) => Number(b.city === city) - Number(a.city === city) || b.rating - a.rating).slice(0, 6);
  const cityGroups = groups.filter((g) => !city || g.city === city).slice(0, 3);
  const booking = bookings[0];
  const bookingMentor = booking ? mentors.find((m) => m.id === booking.mentorId) : null;

  return (
    <Screen top={gradients.roleTop.student} tabBar padded={false} header={<AppHeader roleSwitch />}>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        {ticket.onHome ? (
          <>
            <Animated.View entering={enter(0)}>
              <Ticket data={ticket.data} onPress={() => setArrivalOpen(true)} />
            </Animated.View>
            <Animated.View entering={enter(1)}>
              <BriefLine />
            </Animated.View>
          </>
        ) : (
          <Animated.View entering={enter(0)}>
            <BriefHero />
          </Animated.View>
        )}
        {j.current ? (
          <Animated.View entering={enter(2)} layout={reflow}>
            <ActionCard key={j.current.step.id} step={j.current.step} />
          </Animated.View>
        ) : null}
        <Animated.View entering={enter(3)}>
          <PressableScale
            onPress={() => router.push('/(app)/parcours')}
            style={styles.journeyRow}
            accessibilityRole="button"
            accessibilityLabel={`Voir tout mon parcours-quête, ${j.doneCount} étapes faites sur ${j.total}`}>
            <IconTile icon={Map} tone="blue" size={46} radius={23} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Tout mon parcours-quête</Text>
              <Text variant="caption" color={palette.muted}>
                {j.doneCount}/{j.total} étapes faites · {Math.round(j.progress * 100)} %
              </Text>
            </View>
            <ChevronRight size={18} color={palette.subtle} />
          </PressableScale>
        </Animated.View>
        <Animated.View entering={enter(4)}>
          <AskField />
        </Animated.View>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 26, marginTop: 26 }}>
        {booking && bookingMentor ? (
          <LinearGradient colors={gradients.hero} style={styles.slide}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={`${bookingMentor.firstName} ${bookingMentor.lastName}`} color={bookingMentor.avatarColor} size={46} />
              <View style={{ flex: 1 }}>
                <Text variant="h3" color="#fff">
                  Appel avec {bookingMentor.firstName}
                </Text>
                <Text variant="small" color="rgba(255,255,255,0.65)">
                  {formatLong(booking.startsAt)} · {formatTime(booking.startsAt)}
                </Text>
              </View>
              <View style={styles.live}>
                <View style={styles.liveDot} />
                <Text variant="caption" color="#FF8A8A">
                  {daysFromToday(booking.startsAt) === 0 ? 'AUJOURD’HUI' : 'À VENIR'}
                </Text>
              </View>
            </View>
            <PressableScale onPress={() => router.push({ pathname: '/(app)/appel/[id]', params: { id: booking.id } })} style={[styles.slideCta, { backgroundColor: palette.electric }]}>
              <Video size={15} color="#fff" />
              <Text variant="smallStrong" color="#fff">
                Rejoindre l’appel
              </Text>
            </PressableScale>
          </LinearGradient>
        ) : null}

        <Reveal>
          <MobilityCard onEditArrival={() => setArrivalOpen(true)} />
        </Reveal>

        {/* Pas de `Reveal` : le chemin a sa propre entrée, tracée au défilement. */}
        <View>
          <SectionHeader
            title="Ton chemin"
            subtitle={`De ${profile.originCity || 'chez toi'} à ${profile.destinationCity ?? 'la France'}, une étape à la fois`}
            action="Détails"
            onAction={() => router.push('/(app)/parcours')}
          />
          <JourneyPath />
        </View>

        <Reveal>
          <SectionHeader
            title="Mentors pour toi"
            subtitle={city ? `D’abord ceux qui vivent à ${city}` : 'Des étudiants passés par là'}
            action={suggested.length ? 'Tous' : undefined}
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
          <SectionHeader title="Ta boîte à outils" subtitle="Tout ce qu’il faut, sans chercher" />
          <ToolsGrid />
        </Reveal>

        <Reveal>
          <SectionHeader title={`Communautés${city ? ` à ${city}` : ''}`} subtitle="Trouve tes gens." action="Voir" onAction={() => router.navigate('/(app)/(tabs)/communaute')} />
          <View style={{ gap: 10 }}>
            {cityGroups.map((g) => (
              <PressableScale key={g.id} onPress={() => router.push({ pathname: '/(app)/groupe/[id]', params: { id: g.id } })} style={styles.groupRow}>
                <IconTile icon={MessageCircle} tone="blue" size={46} radius={23} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{g.name}</Text>
                  <Text variant="caption" color={palette.muted} numberOfLines={1}>
                    {g.tags.join(' · ')}
                  </Text>
                </View>
                <View style={styles.count}>
                  <Text variant="caption" color={palette.subtle}>
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

const styles = StyleSheet.create({
  slide: { borderRadius: radius.xxl, padding: 18, ...shadow.md },
  slideCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', height: 44, borderRadius: 999, marginTop: 14 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(229,72,77,0.15)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B6B' },
  journeyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 44, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  count: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: '#F1F3F9' },
});
