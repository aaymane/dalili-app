import { router } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen, TAB_BAR_SPACE } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ListGroup } from '@/components/ui/ListGroup';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { useEvents, useGroups } from '@/data/hooks';
import { EventInvite, GroupRow, INVITE_W } from '@/features/community/components/GroupCard';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { useRoleTheme } from '@/theme';
import { enter, pop, rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';

/** Un événement reste visible jusqu'à 2 heures après son début. */
const STILL_ON_MS = 2 * 3_600_000;

/**
 * Communauté : les prochains événements en invitations (on les fait défiler), puis tes groupes et ceux à rejoindre.
 * Les mentors créent et animent ; les étudiants rejoignent en un geste.
 */
export default function Communaute() {
  const { c, gradients } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { top, accent } = useRoleTheme();
  const profile = useProfile((s) => s.profile);
  const isMentor = profile.activeRole === 'mentor';
  const { data: groups } = useGroups();
  const { data: events } = useEvents();
  const [q, setQ] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [fab, setFab] = useState(false);
  const [now] = useState(() => Date.now());

  const needle = q.trim().toLowerCase();
  const matches = (text: string, itemCity: string) => (!city || itemCity === city) && (!needle || `${text} ${itemCity}`.toLowerCase().includes(needle));
  const upcoming = events
    .filter((e) => new Date(e.startsAt).getTime() > now - STILL_ON_MS && matches(e.title, e.city))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const shown = groups.filter((g) => matches(g.name, g.city)).sort((a, b) => b.members - a.members);
  const mine = shown.filter((g) => g.isMember);
  const others = shown.filter((g) => !g.isMember);
  // Ta ville d'arrivée d'abord, puis les autres de la plus active à la moins active.
  const cities = useMemo(() => {
    const size: Record<string, number> = {};
    [...groups, ...events].forEach((x) => (size[x.city] = (size[x.city] ?? 0) + 1));
    return Object.keys(size).sort((a, b) => Number(b === profile.destinationCity) - Number(a === profile.destinationCity) || size[b] - size[a]);
  }, [groups, events, profile.destinationCity]);

  return (
    <View style={{ flex: 1 }}>
      <Screen top={top} tabBar padded={false} header={<AppHeader />}>
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text variant="hero">{t('community.title')}</Text>
            <Text variant="small" color={c.subtle}>
              {isMentor ? t('community.mentorIntro') : t('community.byMentors')}
            </Text>
          </View>
          <Input icon={<Search size={16} color={c.electric} />} placeholder={t('community.search')} value={q} onChangeText={setQ} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 12 }}>
          <PressableScale onPress={() => setCity(null)} haptic="select">
            <Chip label={t('explorer.allCities')} active={!city} />
          </PressableScale>
          {cities.map((name) => (
            <PressableScale key={name} onPress={() => setCity(city === name ? null : name)} haptic="select">
              <Chip label={name} active={city === name} />
            </PressableScale>
          ))}
        </ScrollView>

        <View style={{ gap: 30, marginTop: 6 }}>
          <Animated.View entering={rise()} style={{ gap: 12 }}>
            <Text variant="h2" style={styles.gutter}>
              {t('community.upcoming')}
            </Text>
            {upcoming.length ? (
              // Les invitations défilent et s'arrêtent net sur la suivante.
              <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={INVITE_W + 12} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
                {upcoming.map((e, i) => (
                  <Animated.View key={e.id} entering={enter(i)}>
                    <EventInvite e={e} />
                  </Animated.View>
                ))}
              </ScrollView>
            ) : (
              <Text variant="small" color={c.muted} style={styles.gutter}>
                {city ? t('community.noEventsCity', { city }) : t('community.noEvents')}
              </Text>
            )}
          </Animated.View>

          {mine.length ? (
            <Animated.View entering={rise(60)} style={[styles.gutter, { gap: 12 }]}>
              <Text variant="h2">{t('community.myGroups')}</Text>
              <ListGroup>
                {mine.map((g) => (
                  <GroupRow key={g.id} g={g} />
                ))}
              </ListGroup>
            </Animated.View>
          ) : null}

          <Animated.View entering={rise(120)} style={[styles.gutter, { gap: 12 }]}>
            <Text variant="h2">{mine.length ? t('community.moreGroups') : t('community.discover')}</Text>
            {others.length ? (
              <ListGroup>
                {others.map((g) => (
                  <GroupRow key={g.id} g={g} />
                ))}
              </ListGroup>
            ) : (
              <Text variant="small" color={c.muted}>
                {t('community.noGroups')}
              </Text>
            )}
          </Animated.View>
        </View>
      </Screen>
      {isMentor ? (
        <Animated.View entering={pop(300)} style={[styles.fab, { bottom: TAB_BAR_SPACE - 4 }]}>
          <PressableScale onPress={() => setFab(true)} haptic="press" style={[styles.fabBtn, { borderColor: accent }]} accessibilityLabel={t('community.create')}>
            <Plus size={24} color={accent} />
          </PressableScale>
        </Animated.View>
      ) : null}
      <BottomSheet visible={fab} onClose={() => setFab(false)}>
        <Text variant="h2" style={{ marginBottom: 14 }}>
          {t('community.createSomething')}
        </Text>
        <View style={{ gap: 10 }}>
          <Button label={t('community.createGroup')} accent={gradients.mentor} onPress={() => { setFab(false); router.push('/(app)/groupe/nouveau'); }} />
          <Button label={t('community.createEvent')} variant="secondary" onPress={() => { setFab(false); router.push('/(app)/evenement/nouveau'); }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  gutter: { paddingHorizontal: 20 },
  fab: { position: 'absolute', end: 20 },
  fabBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.electricSoft, ...shadow.md },
}));
