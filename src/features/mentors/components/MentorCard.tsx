import { router } from 'expo-router';
import { ChevronRight, Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import type { Mentor } from '@/data/types';
import { palette, radius, shadow } from '@/theme/tokens';

/** Carte verticale (carrousel « Mentors pour toi »). */
export function MentorTile({ m }: { m: Mentor }) {
  return (
    <PressableScale onPress={() => router.push({ pathname: '/(app)/mentor/[id]', params: { id: m.id } })} style={styles.tile}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={52} />
        <View style={styles.rating}>
          <Star size={11} color="#F59E0B" fill="#F59E0B" />
          <Text variant="caption" color={palette.navy}>
            {m.rating.toFixed(1)}
          </Text>
        </View>
      </View>
      <Text variant="h3" numberOfLines={1} style={{ marginTop: 10 }}>
        {m.firstName} {m.lastName}
      </Text>
      <Text variant="caption" color={palette.muted} numberOfLines={1}>
        {m.study}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
        <View style={styles.dot} />
        <Text variant="caption" color={palette.subtle}>
          {m.city}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
        {m.specialties.slice(0, 3).map((s) => (
          <Tag key={s} label={s.split(' ')[0]} />
        ))}
      </View>
      <Text variant="caption" color={m.availableThisWeek ? palette.mentor : palette.muted} style={{ marginTop: 10 }}>
        {m.availableThisWeek ? 'Disponible cette semaine' : 'Complet cette semaine'}
      </Text>
    </PressableScale>
  );
}

/** Ligne horizontale (liste Explorer). */
export function MentorRow({ m }: { m: Mentor }) {
  return (
    <PressableScale onPress={() => router.push({ pathname: '/(app)/mentor/[id]', params: { id: m.id } })} style={styles.row}>
      <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={58} online={m.availableThisWeek} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="h3" numberOfLines={1} style={{ flex: 1 }}>
            {m.firstName} {m.lastName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text variant="smallStrong">{m.rating.toFixed(1)}</Text>
          </View>
        </View>
        <Text variant="caption" color={palette.muted}>
          {m.headline} · {m.city}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {m.specialties.slice(0, 3).map((s) => (
            <Tag key={s} label={s} />
          ))}
        </View>
      </View>
      <ChevronRight size={18} color={palette.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { width: 196, padding: 14, borderRadius: radius.xl, backgroundColor: '#EEF3FF', borderWidth: 1, borderColor: '#E0E8FF' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.mentor },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: '#fff', ...shadow.sm },
});
