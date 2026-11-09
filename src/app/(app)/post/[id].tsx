import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { OwnContentSheet, type OwnContent } from '@/components/feedback/OwnContentSheet';
import { toast } from '@/components/feedback/Toast';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useGroup, usePosts } from '@/data/hooks';
import { CommentRefused, myName, type Comment } from '@/features/community/api';
import { useJoinGroup } from '@/features/community/components/GroupCard';
import { PostCard } from '@/features/community/components/PostCard';
import { commentsKey, useComments, useDeleteComment, useEditComment, useSendComment } from '@/features/community/hooks';
import { Composer } from '@/features/messages/components/Thread';
import { useProfile } from '@/features/profile/store';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { rise } from '@/theme/motion';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Une publication en plein écran : le post, tous ses commentaires, et un champ collé au clavier. */
export default function PostScreen() {
  const { c: colors } = useTheme();
  const t = useT();
  const styles = useStyles();
  const { id, groupId } = useLocalSearchParams<{ id: string; groupId?: string }>();
  const myAvatar = useProfile((s) => s.profile.avatarUri);
  const qc = useQueryClient();
  const { data: group } = useGroup(groupId);
  const post = usePosts(groupId).data.find((p) => p.id === id);
  const comments = useComments(id);
  const send = useSendComment(id, groupId);
  const remove = useDeleteComment(id, groupId);
  const editComment = useEditComment(id, groupId);
  // Appui long sur un de tes commentaires : le menu « Modifier / Supprimer ».
  const [menu, setMenu] = useState<{ c: Comment; content: OwnContent } | null>(null);
  const join = useJoinGroup();
  // Seules les bulles écrites après l'ouverture montent en douceur.
  const [openedAt] = useState(Date.now);
  const list = comments.data ?? [];

  const post_ = (body: string) =>
    send.mutate(
      { body, author: myName() },
      { onError: (e) => toast(e instanceof CommentRefused ? t('community.post.slowDown') : t('community.post.notSent'), 'info') },
    );

  const retry = (c: Comment) => {
    qc.setQueryData<Comment[]>(commentsKey(id), (all = []) => all.filter((x) => x.id !== c.id));
    post_(c.body);
  };

  const openMenu = (c: Comment) => {
    haptics.select();
    setMenu({
      c,
      content: {
        body: c.body,
        maxLength: 2000,
        canEdit: true,
        deleteTitle: t('community.post.deleteTitle'),
        deleteText: t('community.post.deleteText'),
      },
    });
  };

  // Le groupe dit si tu peux commenter (en mode démo, rejoindre le groupe suffit aussi).
  const member = group?.isMember ?? true;
  const footer = member ? (
    <Composer onSend={post_} placeholder={t('community.post.placeholder')} label={t('community.post.label')} />
  ) : (
    <Button label={t('community.post.joinToComment')} variant="secondary" onPress={() => group && join(group)} />
  );

  return (
    <Screen scroll={false} padded={false} keyboard header={<AppHeader back title={group?.name ?? t('community.post.fallbackTitle')} hideActions />} footer={footer}>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          post ? (
            <View style={{ gap: 14, marginBottom: 6 }}>
              <PostCard p={post} city={group?.city} hideComments onDeleted={() => router.back()} />
              <Text variant="overline" color={colors.muted}>
                {list.length ? t('community.post.count', { count: list.length }) : t('community.post.comments')}
              </Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          comments.isPending ? undefined : (
            <Text variant="small" color={colors.subtle} align="center" style={{ marginTop: 12 }}>
              {comments.isError ? t('community.post.loadError') : t('community.post.empty')}
            </Text>
          )
        }
        renderItem={({ item: c }) => {
          const style = [styles.comment, c.isPostAuthor && styles.byAuthor, (c.pending || c.failed) && { opacity: 0.6 }];
          const body = (
            <>
              {/* Ton commentaire en cours d'envoi : ta photo, depuis le téléphone. */}
              <Avatar name={c.author} size={30} color="#94A3B8" uri={c.avatarUrl ?? (c.mine ? myAvatar : null)} cacheKey={c.avatarUrl ? c.avatarPath : null} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="caption" color={colors.electric}>
                  {c.isPostAuthor ? t('community.post.authorTag', { name: c.mine ? t('community.post.you') : c.author }) : c.mine ? t('community.post.you') : c.author}
                  {c.editedAt ? <Text variant="caption" color={colors.muted}>{` · ${t('own.edited')}`}</Text> : null}
                </Text>
                <Text variant="small">{c.body}</Text>
                {c.failed ? (
                  <View style={styles.failed}>
                    <RotateCcw size={12} color={colors.danger} />
                    <Text variant="caption" color={colors.danger}>
                      {t('community.post.notSentTap')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          );
          return (
            <Animated.View entering={new Date(c.createdAt).getTime() > openedAt - 1000 ? rise() : undefined}>
              {/* Seuls les tiens réagissent au doigt : appui long pour modifier ou supprimer, toucher pour renvoyer s'il est raté. */}
              {c.mine ? (
                <PressableScale
                  onLongPress={c.pending || c.failed ? undefined : () => openMenu(c)}
                  delayLongPress={350}
                  onPress={c.failed ? () => retry(c) : undefined}
                  scaleTo={0.98}
                  haptic={false}
                  style={style}
                  accessibilityHint={t('own.hint')}>
                  {body}
                </PressableScale>
              ) : (
                <View style={style}>{body}</View>
              )}
            </Animated.View>
          );
        }}
      />
      <OwnContentSheet
        target={menu?.content ?? null}
        onClose={() => setMenu(null)}
        onSave={(body) => (menu ? editComment.mutateAsync({ id: menu.c.id, body }) : Promise.resolve())}
        onDelete={() => menu && remove.mutate(menu.c.id, { onError: () => toast(t('community.post.deleteFailed'), 'info') })}
      />
    </Screen>
  );
}

const useStyles = makeStyles(({ c }) => ({
  content: { paddingHorizontal: 20, paddingBottom: 16, gap: 8, flexGrow: 1 },
  comment: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: c.card },
  byAuthor: { backgroundColor: c.electricSoft },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
}));
