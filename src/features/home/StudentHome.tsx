import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, ChevronDown, GraduationCap, MessageCircle, Phone, Video } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusPill, Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { demoPartners } from '@/data/demo';
import { useGroups, useMentors } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { ArrivalSheet } from '@/features/journey/components/ArrivalSheet';
import { MobilityCard } from '@/features/journey/components/MobilityCard';
import { StepIcon } from '@/features/journey/components/StepIcon';
import { useJourney } from '@/features/journey/store';
import { MentorTile } from '@/features/mentors/components/MentorCard';
import { displayName, useProfile } from '@/features/profile/store';
import { daysFromToday, formatDayMonth, formatLong, formatTime } from '@/lib/date';
import { useRoleTheme } from '@/theme';
import { gradients, motion, palette, radius, shadow } from '@/theme/tokens';

import { AiCta } from './AiCta';
import { ToolsGrid } from './ToolsGrid';

function Dots({ count, index }: { count: number; index: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignSelf: 'center', marginTop: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
}
function Dot({ active }: { active: boolean }) {
  const s = useAnimatedStyle(() => ({ width: withSpring(active ? 18 : 6, motion.spring), opacity: active ? 1 : 0.35 }));
  return <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: palette.electric }, s]} />;
}

export function ModePill() {
  const { label, accent } = useRoleTheme();
  return (
    <PressableScale onPress={() => router.push('/(app)/role')} style={styles.mode} accessibilityLabel="Changer de mode">
      <View style={[styles.modeDot, { backgroundColor: accent }]}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
      </View>
      <Text variant="caption" color={palette.navy} style={{ letterSpacing: 0.6 }}>
        MODE {label.toUpperCase()}
      </Text>
      <ChevronDown size={14} color={palette.subtle} />
    </PressableScale>
  );
}

/** Accueil Étudiant : mobilité, prochaine action, mentors, communauté, IA, outils. */
export function StudentHome() {
  const profile = useProfile((s) => s.profile);
  const j = useJourney();
  const { data: mentors = [] } = useMentors();
  const { data: groups } = useGroups();
  const bookings = useLocalDb((s) => s.bookings).filter((b) => b.status === 'confirmed' && new Date(b.startsAt) > new Date(Date.now() - 3_600_000));
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 560) - 40;
  const [slide, setSlide] = useState(0);
  const [arrivalOpen, setArrivalOpen] = useState(false);

  const city = profile.destinationCity;
  const suggested = [...mentors].sort((a, b) => Number(b.city === city) - Number(a.city === city) || b.rating - a.rating).slice(0, 6);
  const cityGroups = groups.filter((g) => !city || g.city === city).slice(0, 3);
  const nextItem = j.upcoming.find((u) => !u.current) ?? j.upcoming[0];
  const current = j.current;
  const booking = bookings[0];
  const bookingMentor = booking ? mentors.find((m) => m.id === booking.mentorId) : null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (cardW + 12)));

  const slides = [
    <MobilityCard key="mob" onEditArrival={() => setArrivalOpen(true)} />,
    current ? (
      <LinearGradient key="next" colors={gradients.hero} style={styles.slide}>
        <Text variant="overline" color="rgba(255,255,255,0.6)" style={{ fontSize: 9.5 }}>
          Ta seule action maintenant
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <IconTile size={48} bg="rgba(255,255,255,0.1)">
            <StepIcon name={current.step.icon} color="#9DB6FF" size={22} />
          </IconTile>
          <View style={{ flex: 1 }}>
            <Text variant="h3" color="#fff">
              {current.step.title}
            </Text>
            <Text variant="small" color="rgba(255,255,255,0.65)" numberOfLines={2}>
              {current.step.oneLiner}
            </Text>
          </View>
        </View>
        <PressableScale onPress={() => router.push({ pathname: '/(app)/etape/[id]', params: { id: current.step.id } })} style={styles.slideCta}>
          <Text variant="smallStrong" color={palette.navy}>
            {current.step.action.label}
          </Text>
          <ArrowRight size={15} color={palette.navy} />
        </PressableScale>
      </LinearGradient>
    ) : null,
    <LinearGradient key="call" colors={gradients.hero} style={styles.slide}>
      {booking && bookingMentor ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={`${bookingMentor.firstName} ${bookingMentor.lastName}`} color={bookingMentor.avatarColor} size={46} />
            <View style={{ flex: 1 }}>
              <Text variant="h3" color="#fff">
                Appel avec {bookingMentor.firstName}
              </Text>
              <Text variant="small" color="rgba(255,255,255,0.65)">
                Sujet : {booking.topic}
              </Text>
            </View>
            <View style={styles.live}>
              <View style={styles.liveDot} />
              <Text variant="caption" color="#FF8A8A">
                {daysFromToday(booking.startsAt) === 0 ? 'AUJOURD’HUI' : 'À VENIR'}
              </Text>
            </View>
          </View>
          <Text variant="small" color="rgba(255,255,255,0.75)" style={{ marginTop: 12 }}>
            {formatLong(booking.startsAt)} · {formatTime(booking.startsAt)}
          </Text>
          <PressableScale onPress={() => router.push({ pathname: '/(app)/appel/[id]', params: { id: booking.id } })} style={[styles.slideCta, { backgroundColor: palette.electric }]}>
            <Video size={15} color="#fff" />
            <Text variant="smallStrong" color="#fff">
              Rejoindre l’appel
            </Text>
          </PressableScale>
        </>
      ) : (
        <>
          <Text variant="overline" color="rgba(255,255,255,0.6)" style={{ fontSize: 9.5 }}>
            Un humain, pas un robot
          </Text>
          <Text variant="h2" color="#fff" style={{ marginTop: 8 }}>
            Besoin d’aide pour cette étape ?
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.65)" style={{ marginTop: 4 }}>
            Un étudiant qui est passé par là t’appelle gratuitement.
          </Text>
          <PressableScale onPress={() => router.navigate('/(app)/(tabs)/explorer')} style={styles.slideCta}>
            <Phone size={15} color={palette.navy} />
            <Text variant="smallStrong" color={palette.navy}>
              Planifier un appel
            </Text>
          </PressableScale>
        </>
      )}
    </LinearGradient>,
  ].filter(Boolean);

  return (
    <Screen top={gradients.roleTop.student} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20 }}>
        <Animated.View entering={FadeInDown.springify()}>
          <ModePill />
          <Text variant="hero" style={{ marginTop: 14 }}>
            Bonjour <Text variant="hero" color={palette.electric}>{displayName(profile).toUpperCase()}.</Text>
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(80).springify()} style={{ marginTop: 16 }}>
        <ScrollView
          horizontal
          pagingEnabled={false}
          snapToInterval={cardW + 12}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
          {slides.map((s, i) => (
            <View key={i} style={{ width: cardW }}>
              {s}
            </View>
          ))}
        </ScrollView>
        <Dots count={slides.length} index={slide} />
      </Animated.View>

      <View style={{ paddingHorizontal: 20, gap: 26, marginTop: 18 }}>
        {nextItem ? (
          <Animated.View entering={FadeInDown.delay(140).springify()}>
            <PressableScale
              onPress={() => (nextItem.kind === 'official' ? router.push({ pathname: '/(app)/etape/[id]', params: { id: nextItem.step.id } }) : router.push('/(app)/parcours'))}
              style={styles.nextRow}>
              <View style={[styles.nextDot, { backgroundColor: nextItem.kind === 'custom' ? '#A78BFA' : palette.electric }]} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="smallStrong">{nextItem.kind === 'official' ? nextItem.step.title : nextItem.custom.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Tag label={nextItem.kind === 'official' ? nextItem.step.tags[0] : 'Ma tâche'} />
                  <Text variant="caption" color={palette.muted}>
                    {formatDayMonth(nextItem.date)}
                  </Text>
                </View>
              </View>
              {daysFromToday(nextItem.date) <= 7 ? <StatusPill status="soon" label={`Dans ${Math.max(0, daysFromToday(nextItem.date))} j`} /> : <StatusPill status="todo" />}
            </PressableScale>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SectionHeader title="Mentors pour toi" subtitle="Choisis par notre IA · même parcours que toi" action="Tous" onAction={() => router.navigate('/(app)/(tabs)/explorer')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
            {suggested.map((m) => (
              <MentorTile key={m.id} m={m} />
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <SectionHeader title="Ta boîte à outils" subtitle="Tout ce qu’il faut, sans chercher" />
          <ToolsGrid />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).springify()}>
          <SectionHeader title={`Communautés${city ? ` à ${city}` : ''}`} subtitle="Trouve tes gens." action="Voir" onAction={() => router.navigate('/(app)/(tabs)/communaute')} />
          <View style={{ gap: 10 }}>
            {cityGroups.map((g) => (
              <PressableScale key={g.id} onPress={() => router.push({ pathname: '/(app)/groupe/[id]', params: { id: g.id } })} style={styles.groupRow}>
                <IconTile size={46} colors={['#7FA6FF', '#3D78FF']} radius={23}>
                  <MessageCircle size={20} color="#fff" />
                </IconTile>
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
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).springify()}>
          <AiCta />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360).springify()}>
          <SectionHeader title="Nos partenaires" subtitle="Ils nous font confiance pour ta réussite en France." />
          <View style={styles.partners}>
            {demoPartners.map((p) => (
              <View key={p.id} style={styles.partner}>
                <IconTile size={36} bg={p.color} radius={10}>
                  <GraduationCap size={18} color="#fff" />
                </IconTile>
                <Text variant="caption" color={palette.navy} align="center" numberOfLines={2}>
                  {p.tagline}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
      <ArrivalSheet visible={arrivalOpen} onClose={() => setArrivalOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mode: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#fff', paddingLeft: 6, paddingRight: 12, height: 34, borderRadius: 999, ...shadow.sm },
  modeDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  slide: { borderRadius: radius.xxl, padding: 18, minHeight: 228, justifyContent: 'space-between', ...shadow.md },
  slideCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', height: 44, borderRadius: 999, marginTop: 14 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(229,72,77,0.15)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B6B' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  nextDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 5, borderColor: '#E7E0FF' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  count: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: '#F1F3F9' },
  partners: { flexDirection: 'row', gap: 10 },
  partner: { flex: 1, alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.lg, backgroundColor: '#fff', ...shadow.sm },
});
