import { router } from 'expo-router';
import { Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen, TAB_BAR_SPACE } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Segmented } from '@/components/ui/Segmented';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { useEvents, useGroups } from '@/data/hooks';
import { EventCard, GroupCard } from '@/features/community/components/GroupCard';
import { useT } from '@/i18n';
import { useRoleTheme } from '@/theme';
import { makeStyles, useTheme } from '@/theme/scheme';
import { pop, rise } from '@/theme/motion';

/** Communautés : groupes par ville + événements proches. */
export default function Communaute() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { top } = useRoleTheme();
  const { data: groups } = useGroups();
  const { data: events } = useEvents();
  const [mode, setMode] = useState<'all' | 'groups' | 'events'>('all');
  const [q, setQ] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [fab, setFab] = useState(false);

  const needle = q.trim().toLowerCase();
  const gs = useMemo(() => groups.filter((g) => (!city || g.city === city) && (!needle || `${g.name} ${g.city}`.toLowerCase().includes(needle))), [groups, city, needle]);
  const es = useMemo(() => events.filter((e) => (!city || e.city === city) && (!needle || `${e.title} ${e.city}`.toLowerCase().includes(needle))), [events, city, needle]);
  const cityCounts = useMemo(() => {
    const c: Record<string, number> = {};
    groups.forEach((g) => (c[g.city] = (c[g.city] ?? 0) + g.members));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [groups]);

  return (
    <View style={{ flex: 1 }}>
      <Screen top={top} tabBar padded={false} header={<AppHeader />}>
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <Text variant="hero">{t('community.title')}</Text>
          <Input
            icon={<Search size={16} color={c.electric} />}
            placeholder={t('community.search')}
            value={q}
            onChangeText={setQ}
            right={
              <PressableScale onPress={() => setMode(mode === 'all' ? 'groups' : 'all')} style={[styles.filter, mode !== 'all' && { backgroundColor: c.electric }]}
                accessibilityLabel={t('community.filterA11y')}
                accessibilityState={{ selected: mode !== 'all' }}>
                <SlidersHorizontal size={16} color={mode !== 'all' ? '#fff' : c.navy} />
              </PressableScale>
            }
          />
          {mode !== 'all' && (
            <Animated.View entering={FadeIn}>
              <Segmented
                value={mode === 'events' ? 'events' : 'groups'}
                onChange={(v) => setMode(v)}
                options={[
                  { value: 'groups', label: t('community.groups') },
                  { value: 'events', label: t('community.events') },
                ]}
              />
            </Animated.View>
          )}
          <Text variant="smallStrong">{t('community.cities')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 10 }}>
          {cityCounts.map(([c, n]) => (
            <PressableScale key={c} onPress={() => setCity(city === c ? null : c)} haptic="select">
              <Chip label={c} count={n} active={city === c} />
            </PressableScale>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, gap: 26, marginTop: 8 }}>
          {mode !== 'events' && (
            <Animated.View entering={rise()}>
              <SectionHeader title={t('community.popularGroups')} action={t('community.seeAll')} onAction={() => setMode('groups')} />
              <View style={{ gap: 14 }}>
                {(mode === 'groups' ? gs : gs.slice(0, 3)).map((g) => (
                  <GroupCard key={g.id} g={g} />
                ))}
              </View>
            </Animated.View>
          )}
          {mode !== 'groups' && (
            <Animated.View entering={rise(80)}>
              <SectionHeader title={t('community.nearEvents')} action={t('community.seeAll')} onAction={() => setMode('events')} />
              <View style={{ gap: 14 }}>
                {(mode === 'events' ? es : es.slice(0, 3)).map((e) => (
                  <EventCard key={e.id} e={e} />
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      </Screen>
      <Animated.View entering={pop(300)} style={[styles.fab, { bottom: TAB_BAR_SPACE - 4 }]}>
        <PressableScale onPress={() => setFab(true)} haptic="press" style={styles.fabBtn} accessibilityLabel={t('community.create')}>
          <Plus size={24} color={c.navy} />
        </PressableScale>
      </Animated.View>
      <BottomSheet visible={fab} onClose={() => setFab(false)}>
        <Text variant="h2" style={{ marginBottom: 14 }}>
          {t('community.createSomething')}
        </Text>
        <View style={{ gap: 10 }}>
          <Button label={t('community.createGroup')} onPress={() => { setFab(false); router.push('/(app)/groupe/nouveau'); }} />
          <Button label={t('community.createEvent')} variant="secondary" onPress={() => { setFab(false); router.push('/(app)/evenement/nouveau'); }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  filter: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', end: 20 },
  fabBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.electricSoft, ...shadow.md },
}));
