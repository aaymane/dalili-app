import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ChevronRight } from '@/components/ui/DirIcons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { Mentor } from '@/data/types';
import { useT } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/scheme';
import { radius } from '@/theme/tokens';
import { specialtyLabel } from '../specialties';

const open = (id: string) => router.push({ pathname: '/(app)/mentor/[id]', params: { id } });

/** Note du mentor : l'étoile et le chiffre, rien d'autre. */
function Rating({ value }: { value: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Star size={12} color={c.warning} fill={c.warning} />
      <Text variant="smallStrong">{value.toFixed(1)}</Text>
    </View>
  );
}

/** Carte verticale (carrousel « Mentors pour toi »). */
export function MentorTile({ m }: { m: Mentor }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <PressableScale onPress={() => open(m.id)} style={styles.tile}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} uri={m.avatarUrl} cacheKey={m.avatarPath} size={52} online={m.availableThisWeek} />
        <Rating value={m.rating} />
      </View>
      <View style={{ gap: 2, marginTop: 12 }}>
        <Text variant="h3" numberOfLines={1}>
          {m.firstName} {m.lastName}
        </Text>
        <Text variant="small" color={c.muted} numberOfLines={1}>
          {m.study} · {m.city}
        </Text>
      </View>
      <Text variant="small" color={c.subtle} numberOfLines={2} style={{ marginTop: 10, minHeight: 36 }}>
        {m.specialties.slice(0, 3).map(specialtyLabel).join(' · ')}
      </Text>
      <Text variant="caption" color={m.availableThisWeek ? c.mentorInk : c.muted} style={{ marginTop: 10 }}>
        {m.availableThisWeek ? t('mentors.tile.available') : t('mentors.tile.full')}
      </Text>
    </PressableScale>
  );
}

/** Ligne de la liste Explorer (dans un ListGroup) : qui, où, pour quoi. */
export function MentorRow({ m }: { m: Mentor }) {
  const { c } = useTheme();
  const t = useT();
  const styles = useStyles();
  return (
    <PressableScale
      scaleTo={0.985}
      onPress={() => open(m.id)}
      style={styles.row}
      accessibilityLabel={`${m.firstName} ${m.lastName}, ${m.headline}, ${m.city}. ${m.availableThisWeek ? t('mentors.tile.available') : t('mentors.tile.full')}`}>
      <Avatar name={`${m.firstName} ${m.lastName}`} color={m.avatarColor} uri={m.avatarUrl} cacheKey={m.avatarPath} size={52} online={m.availableThisWeek} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="h3" numberOfLines={1} style={{ flex: 1 }}>
            {m.firstName} {m.lastName}
          </Text>
          <Rating value={m.rating} />
        </View>
        <Text variant="small" color={c.muted} numberOfLines={1}>
          {m.headline} · {m.city}
        </Text>
        <Text variant="small" color={c.subtle} numberOfLines={1} style={{ marginTop: 4 }}>
          {m.specialties.slice(0, 3).map(specialtyLabel).join(' · ')}
        </Text>
      </View>
      <ChevronRight size={16} color={c.muted} />
    </PressableScale>
  );
}

const useStyles = makeStyles(({ c }) => ({
  tile: { width: 200, padding: 16, borderRadius: radius.xl, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14 },
}));
