import { Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react-native';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { PostWithState } from '@/data/hooks';
import { useLocalDb } from '@/data/local-db';
import { palette, radius, shadow } from '@/theme/tokens';

const ago = (iso: string) => {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (h < 1) return 'à l’instant';
  if (h < 24) return `il y a ${h} heure${h > 1 ? 's' : ''}`;
  return `il y a ${Math.round(h / 24)} j`;
};

export function PostCard({ p, city }: { p: PostWithState; city?: string }) {
  const toggleLike = useLocalDb((s) => s.toggleLike);
  const scale = useSharedValue(1);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar name={p.author} size={40} color={p.authorColor} />
        <View style={{ flex: 1 }}>
          <Text variant="smallStrong" color={palette.electric}>
            {p.author}
          </Text>
          <Text variant="caption" color={palette.muted}>
            {ago(p.createdAt)}
            {city ? ` · ${city}` : ''}
          </Text>
        </View>
        <MoreHorizontal size={18} color={palette.muted} />
      </View>
      <Text variant="body">{p.body}</Text>
      <View style={styles.actions}>
        <PressableScale
          haptic="select"
          onPress={() => {
            scale.value = withSequence(withSpring(1.35, { damping: 6 }), withSpring(1));
            toggleLike(p.id);
          }}
          style={styles.action}
          accessibilityLabel="J'aime">
          <Animated.View style={heart}>
            <Heart size={18} color={p.liked ? '#E5484D' : palette.subtle} fill={p.liked ? '#E5484D' : 'transparent'} />
          </Animated.View>
          <Text variant="smallStrong" color={palette.subtle}>
            {p.likes}
          </Text>
        </PressableScale>
        <View style={styles.action}>
          <MessageCircle size={18} color={palette.subtle} />
          <Text variant="smallStrong" color={palette.subtle}>
            {p.comments.length}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <PressableScale onPress={() => Share.share({ message: `${p.author} sur DALILI : ${p.body}` }).catch(() => {})} accessibilityLabel="Partager">
          <Share2 size={18} color={palette.subtle} />
        </PressableScale>
      </View>
      {p.comments.map((c, i) => (
        <View key={i} style={[styles.comment, c.isAuthor && { marginLeft: 28, backgroundColor: '#EEF3FF' }]}>
          <Avatar name={c.author} size={26} color="#94A3B8" />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={palette.electric}>
              {c.author}
              {c.isAuthor ? ' (Auteur)' : ''}
            </Text>
            <Text variant="small">{c.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  comment: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: '#F7F8FC' },
});
