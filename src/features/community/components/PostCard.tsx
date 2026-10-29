import { Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react-native';
import { Share, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { PostWithState } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

const ago = (iso: string) => {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (h < 1) return 'à l’instant';
  if (h < 24) return `il y a ${h} heure${h > 1 ? 's' : ''}`;
  return `il y a ${Math.round(h / 24)} j`;
};

/**
 * Un post du fil. `onOpen` : ouvrir la publication et tous ses commentaires (sur la carte, les 2 derniers).
 * `hideComments` : sur l'écran du post, qui les affiche lui-même.
 */
export function PostCard({ p, city, onOpen, hideComments }: { p: PostWithState; city?: string; onOpen?: () => void; hideComments?: boolean }) {
  const { c: colors } = useTheme();
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
            {ago(p.createdAt)}
            {city ? ` · ${city}` : ''}
          </Text>
        </View>
        <MoreHorizontal size={18} color={colors.muted} />
      </View>
      {onOpen ? (
        <PressableScale onPress={onOpen} scaleTo={0.99} haptic={false} accessibilityLabel={`Ouvrir la publication de ${p.author}`}>
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
          accessibilityLabel="J'aime">
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
            accessibilityLabel={`${p.comments.length} commentaire${p.comments.length > 1 ? 's' : ''}. Commenter`}>
            <MessageCircle size={18} color={colors.subtle} />
            <Text variant="smallStrong" color={colors.subtle}>
              {p.comments.length}
            </Text>
          </PressableScale>
        ) : (
          <View style={styles.action} accessible accessibilityLabel={`${p.comments.length} commentaire${p.comments.length > 1 ? 's' : ''}`}>
            <MessageCircle size={18} color={colors.subtle} />
            <Text variant="smallStrong" color={colors.subtle}>
              {p.comments.length}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <PressableScale onPress={() => Share.share({ message: `${p.author} sur DALILI : ${p.body}` }).catch(() => {})} accessibilityLabel="Partager">
          <Share2 size={18} color={colors.subtle} />
        </PressableScale>
      </View>
      {hideComments ? null : p.comments.slice(-2).map((c, i) => (
        <View key={i} style={[styles.comment, c.isAuthor && { marginLeft: 28, backgroundColor: colors.electricSoft }]}>
          <Avatar name={c.author} size={26} color="#94A3B8" />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.electric}>
              {c.author}
              {c.isAuthor ? ' (Auteur)' : ''}
            </Text>
            <Text variant="small">{c.body}</Text>
          </View>
        </View>
      ))}
      {!hideComments && onOpen && p.comments.length > 2 ? (
        <PressableScale onPress={onOpen} hitSlop={6} style={styles.more}>
          <Text variant="smallStrong" color={colors.electric}>
            Voir les {p.comments.length} commentaires
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
