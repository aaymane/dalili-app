import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
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
import { PostCard } from '@/features/community/components/PostCard';
import { commentsKey, useComments, useDeleteComment, useSendComment } from '@/features/community/hooks';
import { Composer } from '@/features/messages/components/Thread';
import { haptics } from '@/lib/haptics';
import { rise } from '@/theme/motion';
import { palette, radius } from '@/theme/tokens';

/** Une publication en plein écran : le post, tous ses commentaires, et un champ collé au clavier. */
export default function PostScreen() {
  const { id, groupId } = useLocalSearchParams<{ id: string; groupId?: string }>();
  const qc = useQueryClient();
  const { data: group } = useGroup(groupId);
  const post = usePosts(groupId).data.find((p) => p.id === id);
  const comments = useComments(id);
  const send = useSendComment(id, groupId);
  const remove = useDeleteComment(id, groupId);
  // Seules les bulles écrites après l'ouverture montent en douceur.
  const [openedAt] = useState(Date.now);
  const list = comments.data ?? [];

  const post_ = (body: string) =>
    send.mutate(
      { body, author: myName() },
      { onError: (e) => toast(e instanceof CommentRefused ? e.message : 'Pas envoyé. Vérifie ta connexion, puis touche le commentaire pour le renvoyer.', 'info') },
    );

  const retry = (c: Comment) => {
    qc.setQueryData<Comment[]>(commentsKey(id), (all = []) => all.filter((x) => x.id !== c.id));
    post_(c.body);
  };

  const askDelete = (c: Comment) => {
    haptics.select();
    Alert.alert('Supprimer ton commentaire ?', 'Il disparaît pour tout le groupe.', [
      { text: 'Garder', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => remove.mutate(c.id, { onError: () => toast('Pas supprimé. Vérifie ta connexion et réessaie.', 'info') }) },
    ]);
  };

  // Le groupe dit si tu peux commenter (en mode démo, rejoindre le groupe suffit aussi).
  const member = group?.isMember ?? true;
  const footer = member ? (
    <Composer onSend={post_} placeholder="Écris un commentaire…" label="Ton commentaire" />
  ) : (
    <Button label="Rejoindre le groupe pour commenter" variant="secondary" onPress={() => router.back()} />
  );

  return (
    <Screen scroll={false} padded={false} keyboard header={<AppHeader back title={group?.name ?? 'Publication'} hideActions />} footer={footer}>
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
              <Text variant="overline" color={palette.muted}>
                {list.length ? `${list.length} commentaire${list.length > 1 ? 's' : ''}` : 'Commentaires'}
              </Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          comments.isPending ? undefined : (
            <Text variant="small" color={palette.subtle} align="center" style={{ marginTop: 12 }}>
              {comments.isError ? 'Impossible de charger les commentaires. Vérifie ta connexion.' : 'Personne n’a encore répondu. Sois le premier ou la première 🙂'}
            </Text>
          )
        }
        renderItem={({ item: c }) => (
          <Animated.View entering={new Date(c.createdAt).getTime() > openedAt - 1000 ? rise() : undefined}>
            <PressableScale
              onLongPress={c.mine && !c.pending ? () => askDelete(c) : undefined}
              onPress={c.failed ? () => retry(c) : undefined}
              disabled={!c.mine}
              scaleTo={0.99}
              haptic={false}
              style={[styles.comment, c.isPostAuthor && styles.byAuthor, (c.pending || c.failed) && { opacity: 0.6 }]}
              accessibilityHint={c.mine ? 'Appui long pour supprimer' : undefined}>
              <Avatar name={c.author} size={30} color="#94A3B8" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="caption" color={palette.electric}>
                  {c.mine ? 'Toi' : c.author}
                  {c.isPostAuthor ? ' (Auteur)' : ''}
                </Text>
                <Text variant="small">{c.body}</Text>
                {c.failed ? (
                  <View style={styles.failed}>
                    <RotateCcw size={12} color={palette.danger} />
                    <Text variant="caption" color={palette.danger}>
                      Pas envoyé · Toucher pour renvoyer
                    </Text>
                  </View>
                ) : null}
              </View>
            </PressableScale>
          </Animated.View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 16, gap: 8, flexGrow: 1 },
  comment: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: palette.white },
  byAuthor: { backgroundColor: '#EEF3FF' },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
