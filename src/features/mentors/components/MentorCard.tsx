import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ChevronRight } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Tag } from '@/components/ui/Tag';
import { Text } from '@/components/ui/Text';
import type { Mentor } from '@/data/types';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';

/** Carte verticale (carrousel « Mentors pour toi »). */
export function MentorTile({ m }: { m: Mentor }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale onPress={() => router.push({ pathname: '/(app)/mentor/[id]', params: { id: m.id } })} style={styles.tile}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} size={52} />
        <View style={styles.rating}>
          <Star size={11} color="#F59E0B" fill="#F59E0B" />
          <Text variant="caption" color={c.navy}>
            {m.rating.toFixed(1)}
          </Text>
        </View>
      </View>
      <Text variant="h3" numberOfLines={1} style={{ marginTop: 10 }}>
        {m.firstName} {m.lastName}
      </Text>
      <Text variant="caption" color={c.muted} numberOfLines={1}>
        {m.study}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
        <View style={styles.dot} />
        <Text variant="caption" color={c.subtle}>
          {m.city}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
        {m.specialties.slice(0, 3).map((s) => (
          <Tag key={s} label={s.split(' ')[0]} />
        ))}
      </View>
      <Text variant="caption" color={m.availableThisWeek ? c.mentor : c.muted} style={{ marginTop: 10 }}>
        {m.availableThisWeek ? 'Disponible cette semaine' : 'Complet cette semaine'}
      </Text>
    </PressableScale>
  );
}

/** Ligne horizontale (liste Explorer). */
export function MentorRow({ m }: { m: Mentor }) {
  const { c } = useTheme();
  const styles = useStyles();
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
        <Text variant="caption" color={c.muted}>
          {m.headline} · {m.city}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {m.specialties.slice(0, 3).map((s) => (
            <Tag key={s} label={s} />
          ))}
        </View>
      </View>
      <ChevronRight size={18} color={c.muted} />
    </PressableScale>
  );
}

const useStyles = makeStyles(({ c, shadow }) => ({
  tile: { width: 196, padding: 14, borderRadius: radius.xl, backgroundColor: c.electricSoft, borderWidth: 1, borderColor: c.line },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.card, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.mentor },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.xl, backgroundColor: c.card, ...shadow.sm },
}));
