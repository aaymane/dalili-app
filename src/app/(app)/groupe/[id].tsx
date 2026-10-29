import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Lock, MapPin, Pencil, Plus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { ChevronLeft } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useEvents, useGroup, usePosts } from '@/data/hooks';
import { Cover } from '@/features/community/components/Cover';
import { useJoinGroup } from '@/features/community/components/GroupCard';
import { PostCard } from '@/features/community/components/PostCard';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { monthShort } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { pop, rise } from '@/theme/motion';

type Tab = 'feed' | 'events' | 'members';

/** Page groupe : à propos, fil d'actualité, événements, membres. Contenu réservé aux membres. */
export default function GroupPage() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: g } = useGroup(id);
  const { data: posts } = usePosts(id);
  const { data: events } = useEvents();
  const profile = useProfile((s) => s.profile);
  const join = useJoinGroup();
  const [tab, setTab] = useState<Tab>('feed');
  if (!g) return null;
  const groupEvents = events.filter((e) => e.groupId === g.id || e.city === g.city);
  const members = [...new Set(posts.flatMap((p) => [p.author, ...p.comments.map((c) => c.author)]))];

  return (
    <View style={{ flex: 1 }}>
      <Screen padded={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Cover colors={g.cover} emoji={g.emoji} height={180} radius={26}>
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
            <PressableScale onPress={() => router.back()} style={styles.back} accessibilityLabel={t('common.back')}>
              <ChevronLeft size={20} color="#fff" />
            </PressableScale>
            <View style={{ padding: 16, gap: 4 }}>
              <Text variant="hero" color="#fff">
                {g.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Users size={13} color="rgba(255,255,255,0.85)" />
                <Text variant="small" color="rgba(255,255,255,0.85)">
                  {t('community.group.membersCity', { count: g.members, city: g.city })}
                </Text>
              </View>
              <PressableScale onPress={() => join(g)} haptic="press" style={[styles.joinBtn, g.isMember && { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                {g.isMember ? <Check size={15} color="#fff" strokeWidth={3} /> : <Plus size={15} color="#fff" strokeWidth={3} />}
                <Text variant="smallStrong" color="#fff">
                  {g.isMember ? t('community.member') : t('community.group.join')}
                </Text>
              </PressableScale>
            </View>
          </Cover>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 18, marginTop: 18 }}>
          {!g.isMember && (
            <Animated.View entering={rise()} style={{ gap: 10 }}>
              <Text variant="h2">{t('community.group.about')}</Text>
              <View style={styles.about}>
                <Text variant="body">{g.description}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {g.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text variant="caption">{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          <View style={styles.tabs}>
            {(
              [
                ['feed', t('community.group.feed')],
                ['events', t('community.events')],
                ['members', t('community.group.members')],
              ] as [Tab, string][]
            ).map(([k, l]) => (
              <PressableScale key={k} haptic="select" onPress={() => setTab(k)} style={[styles.tabItem, tab === k && styles.tabOn]}>
                <Text variant="smallStrong" color={tab === k ? c.electric : c.subtle}>
                  {l}
                </Text>
              </PressableScale>
            ))}
          </View>

          {!g.isMember ? (
            <Animated.View entering={FadeIn} style={styles.locked}>
              <View style={styles.lockIcon}>
                <Lock size={20} color={c.electric} />
              </View>
              <Text variant="h2" align="center">
                {t('community.group.lockedTitle')}
              </Text>
              <Text variant="small" color={c.subtle} align="center">
                {t('community.group.lockedText')}
              </Text>
              <PressableScale onPress={() => join(g)} haptic="press" style={[styles.joinBtn, { alignSelf: 'center' }]}>
                <Plus size={15} color="#fff" strokeWidth={3} />
                <Text variant="smallStrong" color="#fff">
                  {t('community.group.join')}
                </Text>
              </PressableScale>
            </Animated.View>
          ) : tab === 'feed' ? (
            <Animated.View key="feed" entering={FadeIn} style={{ gap: 14 }}>
              <PressableScale onPress={() => router.push({ pathname: '/(app)/post/nouveau', params: { groupId: g.id } })} style={styles.composer}>
                <Avatar name={`${profile.firstName} ${profile.lastName}`} uri={profile.avatarUri} size={38} />
                <View style={styles.composerInput}>
                  <Text variant="small" color={c.muted}>
                    {t('community.group.share')}
                  </Text>
                </View>
              </PressableScale>
              {posts.map((p) => (
                <PostCard key={p.id} p={p} city={g.city} onOpen={() => router.push({ pathname: '/(app)/post/[id]', params: { id: p.id, groupId: g.id } })} />
              ))}
              {!posts.length && (
                <Text variant="small" color={c.muted} align="center">
                  {t('community.group.firstPost')}
                </Text>
              )}
            </Animated.View>
          ) : tab === 'events' ? (
            <Animated.View key="events" entering={FadeIn} style={styles.panel}>
              <Text variant="overline" color={c.muted}>
                {t('community.group.upcoming')}
              </Text>
              {groupEvents.map((e) => (
                <PressableScale key={e.id} onPress={() => router.push({ pathname: '/(app)/evenement/[id]', params: { id: e.id } })} style={styles.eventRow}>
                  <View style={styles.dateBox}>
                    <Text variant="caption" color="#fff" style={{ fontSize: 9 }}>
                      {monthShort(e.startsAt)}
                    </Text>
                    <Text variant="h2" color="#fff">
                      {new Date(e.startsAt).getDate()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{e.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color={c.muted} />
                      <Text variant="caption" color={c.muted}>
                        {e.place}, {e.city}
                      </Text>
                    </View>
                  </View>
                </PressableScale>
              ))}
            </Animated.View>
          ) : (
            <Animated.View key="members" entering={FadeIn} style={styles.panel}>
              <Text variant="overline" color={c.muted}>
                {t('community.group.newMembers')}
              </Text>
              {[`${profile.firstName} ${profile.lastName}`.trim() || t('community.group.you'), ...members].map((n, i) => (
                <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar name={n} size={38} color={i ? '#94A3B8' : c.electric} uri={i ? null : profile.avatarUri} />
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {i === 0 ? t('community.group.youTag', { name: n }) : n}
                  </Text>
                  {i > 0 && (
                    <Text variant="smallStrong" color={c.electric}>
                      {t('community.group.follow')}
                    </Text>
                  )}
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </Screen>
      {g.isMember && (
        <Animated.View entering={pop()} style={[styles.fab, { bottom: insets.bottom + 24 }]}>
          <PressableScale onPress={() => router.push({ pathname: '/(app)/post/nouveau', params: { groupId: g.id } })} style={styles.fabBtn} accessibilityLabel={t('community.group.writeA11y')}>
            <Pencil size={20} color={c.navy} />
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  back: { position: 'absolute', top: 12, start: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: c.electric, paddingHorizontal: 16, height: 38, borderRadius: 999, marginTop: 8 },
  about: { padding: 16, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: c.fill },
  tabs: { flexDirection: 'row', backgroundColor: c.card, borderRadius: radius.lg, padding: 4, ...shadow.sm },
  tabItem: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  tabOn: { backgroundColor: c.electricSoft },
  locked: { gap: 10, padding: 22, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  lockIcon: { alignSelf: 'center', width: 52, height: 52, borderRadius: 26, backgroundColor: c.electricSoft, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  composerInput: { flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: c.fill },
  panel: { gap: 14, padding: 16, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBox: { width: 50, height: 54, borderRadius: 14, backgroundColor: c.electric, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', end: 20 },
  fabBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.electricSoft, ...shadow.md },
}));
