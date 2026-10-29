import { Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react-native';
import { Share, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { PostWithState } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { useT } from '@/i18n';
import { timeAgo } from '@/lib/date';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/**
 * Un post du fil. `onOpen` : ouvrir la publication et tous ses commentaires (sur la carte, les 2 derniers).
 * `hideComments` : sur l'écran du post, qui les affiche lui-même.
 */
export function PostCard({ p, city, onOpen, hideComments }: { p: PostWithState; city?: string; onOpen?: () => void; hideComments?: boolean }) {
  const { c: colors } = useTheme();
  const t = useT();
  const styles = useStyles();
  const toggleLike = useLocalDb((s) => s.toggleLike);
  const scale = useSharedValue(1);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar name={p.author} size={40} color={p.authorColor} />
        <View style={{ flex: 1 }}>
          <Text variant="smallStrong" color={colors.electric}>
            {p.author}
          </Text>
          <Text variant="caption" color={colors.muted}>
            {timeAgo(p.createdAt)}
            {city ? ` · ${city}` : ''}
          </Text>
        </View>
        <MoreHorizontal size={18} color={colors.muted} />
      </View>
      {onOpen ? (
        <PressableScale onPress={onOpen} scaleTo={0.99} haptic={false} accessibilityLabel={t('community.post.openA11y', { name: p.author })}>
          <Text variant="body">{p.body}</Text>
        </PressableScale>
      ) : (
        <Text variant="body">{p.body}</Text>
      )}
      <View style={styles.actions}>
        <PressableScale
          haptic="select"
          onPress={() => {
            scale.set(withSequence(withSpring(1.35, { damping: 6 }), withSpring(1)));
            toggleLike(p.id);
          }}
          style={styles.action}
          accessibilityLabel={t('community.post.like')}>
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
          <Avatar name={c.author} size={26} color="#94A3B8" />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.electric}>
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
    </View>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  card: { padding: 16, gap: 12, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  more: { minHeight: 36, justifyContent: 'center' },
  comment: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: c.fill },
}));
