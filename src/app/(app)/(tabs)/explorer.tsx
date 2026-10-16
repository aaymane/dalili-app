import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Bookmark, BookOpen, CheckCircle2, Clock, House, Languages, Search, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { IconTile } from '@/components/ui/IconTile';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { cities } from '@/data/cities';
import { useMentors } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { categories, guides, type GuideCategory } from '@/features/guides/guides';
import { ToolsGrid } from '@/features/home/ToolsGrid';
import { MentorRow } from '@/features/mentors/components/MentorCard';
import { useProfile } from '@/features/profile/store';
import { gradients, palette, radius, shadow } from '@/theme/tokens';

type Tab = 'mentors' | 'guides' | 'hosts';

function TabPill({ label, icon, active, onPress, color }: { label: string; icon: React.ReactNode; active: boolean; onPress: () => void; color: string }) {
  return (
    <PressableScale onPress={onPress} haptic="select" style={[styles.tab, active ? { backgroundColor: color, ...shadow.glow, shadowColor: color } : styles.tabIdle]}>
      {icon}
      <Text variant="smallStrong" color={active ? '#fff' : palette.navy}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Explorer : trouver un mentor, lire les guides, (bientôt) trouver un hôte. */
export default function Explorer() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'mentors');
  useEffect(() => {
    if (params.tab) setTab(params.tab);
  }, [params.tab]);
  const profile = useProfile((s) => s.profile);
  const [q, setQ] = useState('');
  const [city, setCity] = useState<string | null>(profile.destinationCity);
  const [cat, setCat] = useState<GuideCategory | null>(null);
  const { data: mentors = [], isLoading } = useMentors();
  const saved = useLocalDb((s) => s.savedGuides);
  const read = useLocalDb((s) => s.readGuides);
  const toggleSaved = useLocalDb((s) => s.toggleSavedGuide);

  const mentorList = useMemo(() => {
    const t = q.trim().toLowerCase();
    return mentors.filter(
      (m) =>
        (!city || m.city === city) &&
        (!t || `${m.firstName} ${m.lastName} ${m.headline} ${m.specialties.join(' ')}`.toLowerCase().includes(t)),
    );
  }, [mentors, city, q]);

  const guideList = useMemo(() => {
    const t = q.trim().toLowerCase();
    return guides.filter((g) => (!cat || g.category === cat) && (!t || `${g.title} ${g.subtitle}`.toLowerCase().includes(t)));
  }, [cat, q]);

  const cityCounts = useMemo(() => {
    const c: Record<string, number> = {};
    mentors.forEach((m) => (c[m.city] = (c[m.city] ?? 0) + 1));
    return c;
  }, [mentors]);

  const title = tab === 'mentors' ? 'Trouve un mentor' : tab === 'guides' ? 'Guides pratiques' : 'Trouve un hôte';

  return (
    <Screen top={tab === 'hosts' ? gradients.roleTop.host : gradients.roleTop.student} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Animated.View key={title} entering={FadeIn.duration(250)}>
          <Text variant="hero">{title}</Text>
        </Animated.View>
        <Input icon={<Search size={16} color={palette.electric} />} placeholder={tab === 'guides' ? 'Visa, CAF, logement…' : 'Rechercher'} value={q} onChangeText={setQ} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TabPill label="Mentors" icon={<Sparkles size={14} color={tab === 'mentors' ? '#fff' : palette.navy} />} active={tab === 'mentors'} onPress={() => setTab('mentors')} color={palette.electric} />
          <TabPill label="Guides" icon={<BookOpen size={14} color={tab === 'guides' ? '#fff' : palette.navy} />} active={tab === 'guides'} onPress={() => setTab('guides')} color={palette.electric} />
          <TabPill label="Hôtes" icon={<House size={14} color={tab === 'hosts' ? '#fff' : palette.navy} />} active={tab === 'hosts'} onPress={() => setTab('hosts')} color={palette.host} />
        </View>
      </View>

      {tab === 'mentors' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14, marginTop: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
            <PressableScale onPress={() => setCity(null)} haptic="select">
              <Chip label="Toutes" active={!city} />
            </PressableScale>
            {cities
              .filter((c) => cityCounts[c.name])
              .map((c) => (
                <PressableScale key={c.id} onPress={() => setCity(city === c.name ? null : c.name)} haptic="select">
                  <Chip label={c.name} count={cityCounts[c.name]} active={city === c.name} />
                </PressableScale>
              ))}
          </ScrollView>
          <Animated.View layout={LinearTransition.springify()} style={{ gap: 10, paddingHorizontal: 20 }}>
            {isLoading
              ? [0, 1, 2].map((i) => <View key={i} style={styles.skeleton} />)
              : mentorList.map((m, i) => (
                  <Animated.View key={m.id} entering={FadeInDown.delay(i * 50).springify()} layout={LinearTransition.springify()}>
                    <MentorRow m={m} />
                  </Animated.View>
                ))}
            {!isLoading && !mentorList.length ? (
              <View style={styles.empty}>
                <Text variant="h3">Pas encore de mentor ici</Text>
                <Text variant="small" color={palette.muted} align="center">
                  Essaie une autre ville — ou deviens le premier mentor de {city} 💙
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>
      )}

      {tab === 'guides' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16, marginTop: 14, paddingHorizontal: 20 }}>
          <PressableScale onPress={() => router.push('/(app)/lexique')}>
            <LinearGradient colors={['#2B1F7A', '#1F2850']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lexique}>
              <IconTile size={46} colors={['#C084FC', '#7A5AF8']} radius={14}>
                <Languages size={22} color="#fff" />
              </IconTile>
              <View style={{ flex: 1 }}>
                <Text variant="h3" color="#fff">
                  Le lexique anti-jargon
                </Text>
                <Text variant="small" color="rgba(255,255,255,0.7)">
                  CAF, CVEC, VLS-TS… enfin compréhensibles.
                </Text>
              </View>
              <ArrowRight size={18} color="#fff" />
            </LinearGradient>
          </PressableScale>
          <ToolsGrid />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
            <PressableScale onPress={() => setCat(null)} haptic="select">
              <Chip label="Tout" active={!cat} />
            </PressableScale>
            {(Object.keys(categories) as GuideCategory[]).map((c) => (
              <PressableScale key={c} onPress={() => setCat(cat === c ? null : c)} haptic="select">
                <Chip label={categories[c].label} active={cat === c} color={categories[c].color} />
              </PressableScale>
            ))}
          </ScrollView>
          <Animated.View layout={LinearTransition.springify()} style={{ gap: 10 }}>
            {guideList.map((g, i) => {
              const c = categories[g.category];
              return (
                <Animated.View key={g.id} entering={FadeInDown.delay(i * 40).springify()} layout={LinearTransition.springify()}>
                  <PressableScale onPress={() => router.push({ pathname: '/(app)/guide/[id]', params: { id: g.id } })} style={styles.guide}>
                    <View style={[styles.emoji, { backgroundColor: c.soft }]}>
                      <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text variant="caption" color={c.color}>
                        {c.label.toUpperCase()}
                      </Text>
                      <Text variant="bodyStrong" numberOfLines={2}>
                        {g.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={palette.muted} />
                        <Text variant="caption" color={palette.muted}>
                          {g.minutes} min
                        </Text>
                        {read.includes(g.id) ? (
                          <>
                            <CheckCircle2 size={12} color={palette.success} style={{ marginLeft: 6 }} />
                            <Text variant="caption" color={palette.success}>
                              Lu
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <PressableScale onPress={() => toggleSaved(g.id)} haptic="select" hitSlop={10} accessibilityLabel="Enregistrer le guide">
                      <Bookmark size={20} color={saved.includes(g.id) ? palette.electric : palette.muted} fill={saved.includes(g.id) ? palette.electric : 'transparent'} />
                    </PressableScale>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </Animated.View>
        </Animated.View>
      )}

      {tab === 'hosts' && (
        <Animated.View entering={FadeInDown.springify()} style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <LinearGradient colors={['#FB923C', '#EA580C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hostCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <IconTile size={44} bg="rgba(255,255,255,0.2)" radius={14}>
                <House size={20} color="#fff" />
              </IconTile>
              <View style={styles.soon}>
                <Text variant="caption" color="#fff">
                  BIENTÔT
                </Text>
              </View>
            </View>
            <Text variant="h1" color="#fff" style={{ marginTop: 30 }}>
              Hôte
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.85)">
              Un point de chute chez un étudiant de confiance pour tes premières nuits en France. Cette fonctionnalité arrive bientôt.
            </Text>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: '68%' }]} />
            </View>
            <PressableScale onPress={() => router.push('/(app)/role')} style={styles.hostCta}>
              <Text variant="smallStrong" color="#fff" style={{ flex: 1 }}>
                Devenez un point d’ancrage pour votre communauté
              </Text>
              <View style={styles.hostArrow}>
                <ArrowRight size={16} color={palette.host} />
              </View>
            </PressableScale>
          </LinearGradient>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: radius.pill },
  tabIdle: { backgroundColor: '#fff', ...shadow.sm },
  skeleton: { height: 92, borderRadius: radius.xl, backgroundColor: '#E9EDF7' },
  empty: { alignItems: 'center', gap: 6, padding: 24, borderRadius: radius.xl, backgroundColor: '#fff' },
  lexique: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.xl, ...shadow.md },
  guide: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  emoji: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hostCard: { borderRadius: radius.xxl, padding: 20, gap: 8, ...shadow.md, shadowColor: palette.host },
  soon: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
  progress: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 18, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: '#fff', borderRadius: 3 },
  hostCta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  hostArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
