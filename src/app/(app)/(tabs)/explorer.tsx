import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Bookmark, BookOpen, CheckCircle2, Clock, GraduationCap, House, Languages, Search, Sparkles } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { IconTile } from '@/components/ui/IconTile';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import { readMinutes } from '@/data/content';
import { useContent, useMentors } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { categories, categoryOf, type GuideCategory, softOf } from '@/features/guides/categories';
import { countryOf } from '@/features/journey/steps';
import { ToolsGrid } from '@/features/home/ToolsGrid';
import { MentorRow } from '@/features/mentors/components/MentorCard';
import { MentorsSoon } from '@/features/mentors/components/MentorsSoon';
import { useProfile } from '@/features/profile/store';
import { SchoolCard } from '@/features/schools/components/SchoolParts';
import { useSchools } from '@/features/schools/hooks';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { reflow, rise } from '@/theme/motion';

type Tab = 'mentors' | 'guides' | 'schools' | 'hosts';

function TabPill({ label, icon, active, onPress, color }: { label: string; icon: React.ReactNode; active: boolean; onPress: () => void; color: string }) {
  const { c: colors, shadow } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={onPress} haptic="select" style={[styles.tab, active ? { backgroundColor: color, ...shadow.glow, shadowColor: color } : styles.tabIdle]}>
      {icon}
      <Text variant="smallStrong" color={active ? '#fff' : colors.navy}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Explorer : trouver un mentor, lire les guides, découvrir les écoles partenaires, (bientôt) trouver un hôte. */
export default function Explorer() {
  const { c: colors, gradients, scheme } = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  // L'onglet suit le paramètre d'URL (?tab=guides) tant que l'utilisateur ne change pas d'onglet.
  const [picked, setPicked] = useState<{ from?: string; tab: Tab } | null>(null);
  const tab: Tab = picked && picked.from === params.tab ? picked.tab : (params.tab ?? 'mentors');
  const setTab = (t: Tab) => setPicked({ from: params.tab, tab: t });
  const profile = useProfile((s) => s.profile);
  const [q, setQ] = useState('');
  const [city, setCity] = useState<string | null>(profile.destinationCity);
  const [cat, setCat] = useState<GuideCategory | null>(null);
  const { data: mentors = [], isLoading } = useMentors();
  const schools = useSchools();
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

  const { data: manifest } = useContent('manifest');
  const { data: cities } = useContent('cities');
  const country = countryOf(profile);
  const guideList = useMemo(() => {
    const t = q.trim().toLowerCase();
    // Les guides de ton pays et les guides communs (tous les pays, ou aucun pays précisé) ; ceux d'autres pays restent sur le site.
    return manifest.guides
      .filter((g) => !country || !g.countries.length || g.countries.includes(country))
      .filter((g) => (!cat || categoryOf(g.category) === cat) && (!t || `${g.title} ${g.excerpt}`.toLowerCase().includes(t)))
      .sort((a, b) => Number(b.countries.length === 1) - Number(a.countries.length === 1) || b.updatedDate.localeCompare(a.updatedDate));
  }, [cat, q, manifest, country]);

  const cityCounts = useMemo(() => {
    const c: Record<string, number> = {};
    mentors.forEach((m) => (c[m.city] = (c[m.city] ?? 0) + 1));
    return c;
  }, [mentors]);

  const title = tab === 'mentors' ? 'Trouve un mentor' : tab === 'guides' ? 'Guides pratiques' : tab === 'schools' ? 'Nos écoles partenaires' : 'Trouve un hôte';

  return (
    <Screen top={tab === 'hosts' ? gradients.roleTop.host : gradients.roleTop.student} tabBar padded={false} header={<AppHeader />}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Animated.View key={title} entering={FadeIn.duration(250)}>
          <Text variant="hero">{title}</Text>
        </Animated.View>
        {tab === 'schools' ? null : (
          <Input icon={<Search size={16} color={colors.electric} />} placeholder={tab === 'guides' ? 'Visa, CAF, logement…' : 'Rechercher'} value={q} onChangeText={setQ} />
        )}
      </View>
      {/* Quatre onglets : la rangée défile sur les petits écrans, sans rien couper. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 4 }}>
        <TabPill label="Mentors" icon={<Sparkles size={14} color={tab === 'mentors' ? '#fff' : colors.navy} />} active={tab === 'mentors'} onPress={() => setTab('mentors')} color={colors.electric} />
        <TabPill label="Guides" icon={<BookOpen size={14} color={tab === 'guides' ? '#fff' : colors.navy} />} active={tab === 'guides'} onPress={() => setTab('guides')} color={colors.electric} />
        <TabPill label="Écoles" icon={<GraduationCap size={14} color={tab === 'schools' ? '#fff' : colors.navy} />} active={tab === 'schools'} onPress={() => setTab('schools')} color={colors.electric} />
        <TabPill label="Hôtes" icon={<House size={14} color={tab === 'hosts' ? '#fff' : colors.navy} />} active={tab === 'hosts'} onPress={() => setTab('hosts')} color={colors.host} />
      </ScrollView>

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
          <Animated.View layout={reflow} style={{ gap: 10, paddingHorizontal: 20 }}>
            {isLoading
              ? [0, 1, 2].map((i) => <View key={i} style={styles.skeleton} />)
              : mentorList.map((m, i) => (
                  <Animated.View key={m.id} entering={rise(i * 50)} layout={reflow}>
                    <MentorRow m={m} />
                  </Animated.View>
                ))}
            {!isLoading && !mentors.length ? <MentorsSoon /> : null}
            {!isLoading && mentors.length > 0 && !mentorList.length ? (
              <View style={styles.empty}>
                <Text variant="h3">Pas encore de mentor ici</Text>
                <Text variant="small" color={colors.muted} align="center">
                  {city ? `Essaie une autre ville, ou deviens le premier mentor de ${city} 💙` : 'Essaie avec un autre mot.'}
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
              <IconTile icon={Languages} tone="violet" size={46} radius={14} />
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
          <Animated.View layout={reflow} style={{ gap: 10 }}>
            {guideList.map((g, i) => {
              const c = categories[categoryOf(g.category)];
              return (
                <Animated.View key={g.slug} entering={rise(Math.min(i, 6) * 40)} layout={reflow}>
                  <PressableScale onPress={() => router.push({ pathname: '/(app)/guide/[id]', params: { id: g.slug } })} style={styles.guide}>
                    <View style={[styles.emoji, { backgroundColor: softOf(c, scheme) }]}>
                      <Text style={{ fontSize: 24 }}>{c.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text variant="caption" color={c.color}>
                        {c.label.toUpperCase()}
                      </Text>
                      <Text variant="bodyStrong" numberOfLines={2}>
                        {g.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={colors.muted} />
                        <Text variant="caption" color={colors.muted}>
                          {readMinutes(g.readTime)} min
                        </Text>
                        {read.includes(g.slug) ? (
                          <>
                            <CheckCircle2 size={12} color={colors.success} style={{ marginLeft: 6 }} />
                            <Text variant="caption" color={colors.success}>
                              Lu
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <PressableScale onPress={() => toggleSaved(g.slug)} haptic="select" hitSlop={10} accessibilityLabel="Enregistrer le guide">
                      <Bookmark size={20} color={saved.includes(g.slug) ? colors.electric : colors.muted} fill={saved.includes(g.slug) ? colors.electric : 'transparent'} />
                    </PressableScale>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </Animated.View>
        </Animated.View>
      )}

      {tab === 'schools' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14, marginTop: 14, paddingHorizontal: 20 }}>
          <Text variant="body" color={colors.subtle}>
            Des écoles qui accueillent les étudiants du Maghreb et travaillent avec DALILI. Dis-nous laquelle t’attire : l’équipe te recontacte.
          </Text>
          {schools.isPending
            ? [0, 1].map((k) => <View key={k} style={[styles.skeleton, { height: 230 }]} />)
            : (schools.data ?? []).map((sc, k) => (
                <Animated.View key={sc.id} entering={rise(k * 60)}>
                  <SchoolCard school={sc} />
                </Animated.View>
              ))}
          {!schools.isPending && !schools.data?.length ? (
            <View style={styles.empty}>
              <IconTile icon={GraduationCap} tone="blue" size={48} radius={16} />
              <Text variant="h3">{schools.isError ? 'Pas de connexion' : 'Nos premières écoles arrivent'}</Text>
              <Text variant="small" color={colors.muted} align="center">
                {schools.isError ? 'Vérifie ton réseau et réessaie.' : 'On finalise nos premiers partenariats. Elles apparaîtront ici très bientôt.'}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      )}

      {tab === 'hosts' && (
        <Animated.View entering={rise()} style={{ paddingHorizontal: 20, marginTop: 16 }}>
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
                <ArrowRight size={16} color={colors.host} />
              </View>
            </PressableScale>
          </LinearGradient>
        </Animated.View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: radius.pill },
  tabIdle: { backgroundColor: c.card, ...shadow.sm },
  skeleton: { height: 92, borderRadius: radius.xl, backgroundColor: c.fill },
  empty: { alignItems: 'center', gap: 6, padding: 24, borderRadius: radius.xl, backgroundColor: c.card },
  lexique: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.xl, ...shadow.md },
  guide: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  emoji: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hostCard: { borderRadius: radius.xxl, padding: 20, gap: 8, ...shadow.md, shadowColor: c.host },
  soon: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
  progress: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 18, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: c.card, borderRadius: 3 },
  hostCta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  hostArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
}));
