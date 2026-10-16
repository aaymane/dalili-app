import { router } from 'expo-router';
import { Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

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
import { useRoleTheme } from '@/theme';
import { palette, shadow } from '@/theme/tokens';

/** Communautés : groupes par ville + événements proches. */
export default function Communaute() {
  const { top } = useRoleTheme();
  const { data: groups } = useGroups();
  const { data: events } = useEvents();
  const [mode, setMode] = useState<'all' | 'groups' | 'events'>('all');
  const [q, setQ] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [fab, setFab] = useState(false);

  const t = q.trim().toLowerCase();
  const gs = useMemo(() => groups.filter((g) => (!city || g.city === city) && (!t || `${g.name} ${g.city}`.toLowerCase().includes(t))), [groups, city, t]);
  const es = useMemo(() => events.filter((e) => (!city || e.city === city) && (!t || `${e.title} ${e.city}`.toLowerCase().includes(t))), [events, city, t]);
  const cityCounts = useMemo(() => {
    const c: Record<string, number> = {};
    groups.forEach((g) => (c[g.city] = (c[g.city] ?? 0) + g.members));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [groups]);

  return (
    <View style={{ flex: 1 }}>
      <Screen top={top} tabBar padded={false} header={<AppHeader />}>
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <Text variant="hero">Communautés</Text>
          <Input
            icon={<Search size={16} color={palette.electric} />}
            placeholder="Cherche un groupe, événements…"
            value={q}
            onChangeText={setQ}
            right={
              <PressableScale onPress={() => setMode(mode === 'all' ? 'groups' : 'all')} style={[styles.filter, mode !== 'all' && { backgroundColor: palette.electric }]}>
                <SlidersHorizontal size={16} color={mode !== 'all' ? '#fff' : palette.navy} />
              </PressableScale>
            }
          />
          {mode !== 'all' && (
            <Animated.View entering={FadeIn}>
              <Segmented
                value={mode === 'events' ? 'events' : 'groups'}
                onChange={(v) => setMode(v)}
                options={[
                  { value: 'groups', label: 'Groupes' },
                  { value: 'events', label: 'Événements' },
                ]}
              />
            </Animated.View>
          )}
          <Text variant="smallStrong">Villes</Text>
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
            <Animated.View entering={FadeInDown.springify()}>
              <SectionHeader title="Groupes populaires" action="Voir tout" onAction={() => setMode('groups')} />
              <View style={{ gap: 14 }}>
                {(mode === 'groups' ? gs : gs.slice(0, 3)).map((g) => (
                  <GroupCard key={g.id} g={g} />
                ))}
              </View>
            </Animated.View>
          )}
          {mode !== 'groups' && (
            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <SectionHeader title="Événement proche" action="Voir tout" onAction={() => setMode('events')} />
              <View style={{ gap: 14 }}>
                {(mode === 'events' ? es : es.slice(0, 3)).map((e) => (
                  <EventCard key={e.id} e={e} />
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      </Screen>
      <Animated.View entering={ZoomIn.delay(300).springify()} style={[styles.fab, { bottom: TAB_BAR_SPACE - 4 }]}>
        <PressableScale onPress={() => setFab(true)} haptic="press" style={styles.fabBtn} accessibilityLabel="Créer">
          <Plus size={24} color={palette.navy} />
        </PressableScale>
      </Animated.View>
      <BottomSheet visible={fab} onClose={() => setFab(false)}>
        <Text variant="h2" style={{ marginBottom: 14 }}>
          Créer quelque chose
        </Text>
        <View style={{ gap: 10 }}>
          <Button label="Créer un groupe" onPress={() => { setFab(false); router.push('/(app)/groupe/nouveau'); }} />
          <Button label="Créer un événement" variant="secondary" onPress={() => { setFab(false); router.push('/(app)/evenement/nouveau'); }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  filter: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F3F9', alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20 },
  fabBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D6E0FF', ...shadow.md },
});
