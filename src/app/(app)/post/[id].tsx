import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

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
import { commentsKey, useComments, useDeleteComment, useSendComment } from '@/features/community/hooks';
import { Composer } from '@/features/messages/components/Thread';
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
  const qc = useQueryClient();
  const { data: group } = useGroup(groupId);
  const post = usePosts(groupId).data.find((p) => p.id === id);
  const comments = useComments(id);
  const send = useSendComment(id, groupId);
  const remove = useDeleteComment(id, groupId);
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

  const askDelete = (c: Comment) => {
    haptics.select();
    Alert.alert(t('community.post.deleteTitle'), t('community.post.deleteText'), [
      { text: t('community.post.keep'), style: 'cancel' },
      { text: t('community.post.delete'), style: 'destructive', onPress: () => remove.mutate(c.id, { onError: () => toast(t('community.post.deleteFailed'), 'info') }) },
    ]);
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
              <PostCard p={post} city={group?.city} hideComments />
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
              <Avatar name={c.author} size={30} color="#94A3B8" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="caption" color={colors.electric}>
                  {c.isPostAuthor ? t('community.post.authorTag', { name: c.mine ? t('community.post.you') : c.author }) : c.mine ? t('community.post.you') : c.author}
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
              {/* Seuls les tiens réagissent au doigt : appui long pour supprimer, toucher pour renvoyer s'il est raté. */}
              {c.mine ? (
                <PressableScale
                  onLongPress={c.pending ? undefined : () => askDelete(c)}
                  onPress={c.failed ? () => retry(c) : undefined}
                  scaleTo={0.98}
                  haptic={false}
                  style={style}
                  accessibilityHint={t('community.post.deleteHint')}>
                  {body}
                </PressableScale>
              ) : (
                <View style={style}>{body}</View>
              )}
            </Animated.View>
          );
        }}
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
