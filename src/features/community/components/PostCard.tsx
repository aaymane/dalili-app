import { Image } from 'expo-image';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { OwnContentSheet, type OwnContent } from '@/components/feedback/OwnContentSheet';
import { PhotoViewer } from '@/components/feedback/PhotoViewer';
import { toast } from '@/components/feedback/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useDeletePost, useEditPost, useToggleLike, type PostWithState } from '@/data/hooks';
import { useT } from '@/i18n';
import { timeAgo } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/**
 * Un post du fil. `onOpen` : ouvrir la publication et tous ses commentaires (sur la carte, les 2 derniers).
 * `hideComments` : sur l'écran du post, qui les affiche lui-même.
 * La tienne : appui long (en-tête, texte ou photo) pour la modifier ou la supprimer ; `onDeleted` après la suppression.
 */
export function PostCard({
  p,
  city,
  onOpen,
  hideComments,
  onDeleted,
}: {
  p: PostWithState;
  city?: string;
  onOpen?: () => void;
  hideComments?: boolean;
  onDeleted?: () => void;
}) {
  const { c: colors } = useTheme();
  const t = useT();
  const styles = useStyles();
  const toggleLike = useToggleLike(p.groupId);
  const scale = useSharedValue(1);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const [viewing, setViewing] = useState(false);
  const [menu, setMenu] = useState<OwnContent | null>(null);
  const editPost = useEditPost(p.groupId);
  const deletePost = useDeletePost(p.groupId);
  const hasText = p.body.trim().length > 0;
  const openMenu = p.mine
    ? () => {
        haptics.select();
        setMenu({
          body: p.body,
          maxLength: 4000,
          canEdit: true,
          allowEmpty: !!p.imagePath,
          deleteTitle: t('own.postDeleteTitle'),
          deleteText: t('own.postDeleteText'),
        });
      }
    : undefined;
  const ownHint = openMenu ? t('own.hint') : undefined;
  const header = (
    <>
      <Avatar name={p.author} size={40} color={p.authorColor} uri={p.authorAvatarUrl} cacheKey={p.authorAvatarPath} />
      <View style={{ flex: 1 }}>
        <Text variant="smallStrong">{p.author}</Text>
        <Text variant="caption" color={colors.muted}>
          {timeAgo(p.createdAt)}
          {city ? ` · ${city}` : ''}
          {p.editedAt ? ` · ${t('own.edited')}` : ''}
        </Text>
      </View>
    </>
  );
  return (
    <View style={styles.card}>
      {openMenu ? (
        <PressableScale onLongPress={openMenu} delayLongPress={350} scaleTo={0.99} haptic={false} style={styles.header} accessibilityRole="text" accessibilityHint={ownHint}>
          {header}
        </PressableScale>
      ) : (
        <View style={styles.header}>{header}</View>
      )}
      {!hasText ? null : onOpen || openMenu ? (
        <PressableScale
          onPress={onOpen}
          onLongPress={openMenu}
          delayLongPress={350}
          scaleTo={0.99}
          haptic={false}
          accessibilityRole={onOpen ? 'button' : 'text'}
          accessibilityLabel={onOpen ? t('community.post.openA11y', { name: p.author }) : undefined}
          accessibilityHint={ownHint}>
          <Text variant="body">{p.body}</Text>
        </PressableScale>
      ) : (
        <Text variant="body">{p.body}</Text>
      )}
      {p.imageUrl ? (
        // La photo de la publication : carrée dans le fil, en entier quand on la touche.
        <PressableScale
          onPress={() => setViewing(true)}
          onLongPress={openMenu}
          delayLongPress={350}
          scaleTo={0.99}
          style={styles.photo}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('community.post.photoA11y', { name: p.author })}
          accessibilityHint={ownHint}>
          <Image source={{ uri: p.imageUrl, cacheKey: p.imagePath ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        </PressableScale>
      ) : null}
      <View style={styles.actions}>
        <PressableScale
          haptic="select"
          onPress={() => {
            scale.set(withSequence(withSpring(1.35, { damping: 6 }), withSpring(1)));
            toggleLike(p);
          }}
          style={styles.action}
          accessibilityRole="button"
          accessibilityState={{ selected: p.liked }}
          accessibilityLabel={t('community.post.likeA11y', { count: p.likes })}>
          <Animated.View style={heart}>
            <Heart size={18} color={p.liked ? colors.danger : colors.subtle} fill={p.liked ? colors.danger : 'transparent'} />
          </Animated.View>
          <Text variant="smallStrong" color={colors.subtle}>
            {p.likes}
          </Text>
        </PressableScale>
        {onOpen ? (
          <PressableScale
            onPress={onOpen}
            hitSlop={6}
            style={styles.action}
            accessibilityLabel={t('community.post.countComment', { count: p.comments.length })}>
            <MessageCircle size={18} color={colors.subtle} />
            <Text variant="smallStrong" color={colors.subtle}>
              {p.comments.length}
            </Text>
          </PressableScale>
        ) : (
          <View style={styles.action} accessible accessibilityLabel={t('community.post.count', { count: p.comments.length })}>
            <MessageCircle size={18} color={colors.subtle} />
            <Text variant="smallStrong" color={colors.subtle}>
              {p.comments.length}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <PressableScale onPress={() => Share.share({ message: t('community.post.shareMessage', { author: p.author, body: p.body }) }).catch(() => {})} accessibilityLabel={t('community.post.share')}>
          <Share2 size={18} color={colors.subtle} />
        </PressableScale>
      </View>
      {hideComments ? null : p.comments.slice(-2).map((c, i) => (
        <View key={i} style={[styles.comment, c.isAuthor && { marginStart: 28, backgroundColor: colors.electricSoft }]}>
          <Avatar name={c.author} size={26} color={colors.muted} uri={c.avatarUrl} cacheKey={c.avatarPath} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.navy}>
              {c.isAuthor ? t('community.post.authorTag', { name: c.author }) : c.author}
            </Text>
            <Text variant="small">{c.body}</Text>
          </View>
        </View>
      ))}
      {!hideComments && onOpen && p.comments.length > 2 ? (
        <PressableScale onPress={onOpen} hitSlop={6} style={styles.more}>
          <Text variant="smallStrong" color={colors.electric}>
            {t('community.post.seeAll', { n: p.comments.length })}
          </Text>
        </PressableScale>
      ) : null}
      <PhotoViewer uri={viewing ? (p.imageUrl ?? null) : null} cacheKey={p.imagePath ?? undefined} onClose={() => setViewing(false)} />
      {p.mine ? (
        <OwnContentSheet
          target={menu}
          onClose={() => setMenu(null)}
          onSave={(body) => editPost.mutateAsync({ id: p.id, body })}
          onDelete={() => {
            deletePost.mutate({ id: p.id, imagePath: p.imagePath }, { onError: () => toast(t('own.deleteFailed'), 'info') });
            onDeleted?.();
          }}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { padding: 16, gap: 12, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.fill },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  more: { minHeight: 36, justifyContent: 'center' },
  comment: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: c.fill },
}));
