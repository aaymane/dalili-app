import { router, useLocalSearchParams } from 'expo-router';
import { Check, LogOut, Lock, MoreHorizontal, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BottomSheet } from '@/components/feedback/BottomSheet';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { PressableScale } from '@/components/ui/PressableScale';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useEvents, useGroup, usePosts } from '@/data/hooks';
import { EventRow, GroupMark, useJoinGroup } from '@/features/community/components/GroupCard';
import { AddCoverRow, CoverPhoto, useChangeCover } from '@/features/community/cover';
import { PostCard } from '@/features/community/components/PostCard';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { wash } from '@/lib/color';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { rise } from '@/theme/motion';

type Tab = 'feed' | 'events' | 'members';

/** Page groupe : qui il réunit, puis ses discussions, ses événements et ses membres actifs (réservés aux membres). */
export default function GroupPage() {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: g } = useGroup(id);
  const { data: posts } = usePosts(id);
  const { data: events } = useEvents();
  const profile = useProfile((s) => s.profile);
  const join = useJoinGroup();
  const [tab, setTab] = useState<Tab>('feed');
  // Quitter le groupe : rangé dans « … », puis confirmé (on ne part pas d'un seul toucher par erreur).
  const [menu, setMenu] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cover = useChangeCover('groups', id);
  const [now] = useState(() => Date.now());
  if (!g) return null;
  const groupEvents = events
    .filter((e) => (e.groupId === g.id || e.city === g.city) && new Date(e.startsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  // Les membres qu'on connaît vraiment : ceux qui ont écrit ou répondu dans le groupe, et toi.
  const me = `${profile.firstName} ${profile.lastName}`.trim();
  const active = [...new Set(posts.flatMap((p) => [p.author, ...p.comments.map((x) => x.author)]))].filter((n) => n !== me);

  return (
    // Le haut de l'écran prend la couleur du groupe, en lavis : pas de bannière.
    <Screen top={wash(g.cover[0], c.bg)} padded={false} header={<AppHeader back />}>
      <View style={{ paddingHorizontal: 20, gap: 22 }}>
        <Animated.View entering={rise()} style={{ gap: 16 }}>
          {g.coverUrl ? (
            <CoverPhoto uri={g.coverUrl} cacheKey={g.coverPath} onChange={g.isMine ? cover.change : undefined} busy={cover.busy} />
          ) : (
            <GroupMark colors={g.cover} emoji={g.emoji} size={76} />
          )}
          <View style={{ gap: 4 }}>
            <Text variant="hero">{g.name}</Text>
            <Text variant="small" color={c.subtle}>
              {t('community.group.membersCity', { count: g.members, city: g.city })} · {g.privacy === 'private' ? t('community.private') : t('community.public')}
            </Text>
          </View>
          {g.description ? (
            <Text variant="body" color={c.subtle} numberOfLines={g.isMember ? 3 : undefined}>
              {g.description}
            </Text>
          ) : null}
          {g.tags.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {g.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text variant="caption" color={c.subtle}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {g.isMine && !g.coverUrl ? <AddCoverRow onPress={cover.change} busy={cover.busy} /> : null}
          {g.isMember ? (
            <View style={styles.memberRow}>
              <View style={styles.memberPill}>
                <Check size={14} color={c.success} strokeWidth={3} />
                <Text variant="smallStrong">
                  {t('community.group.youreIn')}
                </Text>
              </View>
              <PressableScale onPress={() => setMenu(true)} haptic="select" style={styles.more} accessibilityLabel={t('community.group.moreA11y')}>
                <MoreHorizontal size={20} color={c.navy} />
              </PressableScale>
            </View>
          ) : (
            <Button label={t('community.group.join')} icon={<Plus size={16} color={c.white} strokeWidth={3} />} onPress={() => join(g)} />
          )}
        </Animated.View>

        <Segmented
          kind="track"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'feed', label: t('community.group.feed') },
            { value: 'events', label: t('community.events') },
            { value: 'members', label: t('community.group.members') },
          ]}
        />

        {!g.isMember ? (
          <Animated.View entering={FadeIn} style={styles.locked}>
            <Lock size={18} color={c.muted} />
            <Text variant="h3" align="center">
              {t('community.group.lockedTitle')}
            </Text>
            <Text variant="small" color={c.muted} align="center">
              {t('community.group.lockedText')}
            </Text>
          </Animated.View>
        ) : tab === 'feed' ? (
          <Animated.View key="feed" entering={FadeIn} style={{ gap: 14 }}>
            <PressableScale onPress={() => router.push({ pathname: '/(app)/post/nouveau', params: { groupId: g.id } })} style={styles.composer} accessibilityRole="button">
              <Avatar name={me || t('community.group.you')} uri={profile.avatarUri} size={36} />
              <Text variant="small" color={c.muted} style={{ flex: 1 }}>
                {t('community.group.share')}
              </Text>
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
          <Animated.View key="events" entering={FadeIn}>
            {groupEvents.length ? (
              <ListGroup>
                {groupEvents.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </ListGroup>
            ) : (
              <Text variant="small" color={c.muted} align="center">
                {t('community.noEventsCity', { city: g.city })}
              </Text>
            )}
          </Animated.View>
        ) : (
          <Animated.View key="members" entering={FadeIn}>
            <ListGroup>
              {[me || t('community.group.you'), ...active].map((n, i) => (
                <View key={n} style={styles.member}>
                  <Avatar name={n} size={36} color={i ? c.muted : c.electric} uri={i ? null : profile.avatarUri} />
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {i === 0 ? t('community.group.youTag', { name: n }) : n}
                  </Text>
                </View>
              ))}
            </ListGroup>
          </Animated.View>
        )}
      </View>
      <BottomSheet visible={menu} onClose={() => setMenu(false)}>
        <ListGroup>
          <PressableScale
            onPress={() => {
              setMenu(false);
              setTimeout(() => setLeaving(true), 320);
            }}
            scaleTo={0.985}
            style={styles.menuRow}
            accessibilityRole="button">
            <LogOut size={20} color={c.danger} />
            <Text variant="bodyStrong" color={c.danger}>
              {t('community.group.leave')}
            </Text>
          </PressableScale>
        </ListGroup>
      </BottomSheet>
      <BottomSheet visible={leaving} onClose={() => setLeaving(false)}>
        <View style={{ gap: 14 }}>
          <Text variant="h2">{t('community.group.leaveTitle', { name: g.name })}</Text>
          <Text variant="body" color={c.subtle}>
            {t('community.group.leaveText')}
          </Text>
          <Button
            label={t('community.group.leave')}
            variant="danger"
            onPress={() => {
              setLeaving(false);
              join(g);
            }}
          />
          <Button label={t('community.group.stay')} variant="secondary" onPress={() => setLeaving(false)} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: c.fill },
  locked: { alignItems: 'center', gap: 6, paddingVertical: 18, paddingHorizontal: 12 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: c.card, ...shadow.sm },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill, backgroundColor: c.fill },
  more: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 56 },
}));
